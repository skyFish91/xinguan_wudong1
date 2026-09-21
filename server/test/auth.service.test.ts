import { AuthService } from '../src/module/auth/auth.service';
import { JwtService } from '@midwayjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserEntity, MerchantEntity } from '../src/entity/user.entity';
import { repo, makeService } from './helpers/db';

/** 内存版 Redis：满足测试所需 set/get/del */
class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string) { this.store.set(key, val); }
  async get(key: string) { return this.store.get(key) ?? null; }
  async del(key: string) { this.store.delete(key); }
}

const JWT_SECRET = 'unit-test-secret';

/** 组装 AuthService：真实仓库 + 内存 Redis + 真实 JwtService */
function wireAuthService(): { svc: AuthService; jwt: JwtService; redis: FakeRedis } {
  const svc = makeService(AuthService);
  svc.userRepo = repo(UserEntity);
  svc.merchantRepo = repo(MerchantEntity);
  const redis = new FakeRedis();
  const jwt = new JwtService();
  // jwtConfig 平时由容器 @Config('jwt') 注入，测试环境手动补空配置（secret 走 signSync 显式传参）
  (jwt as any).jwtConfig = {};
  svc.redis = redis as any;
  svc.jwtService = jwt;
  svc.jwtSecret = JWT_SECRET;
  return { svc, jwt, redis };
}

/** 造用户（密码以 bcrypt 加密落库） */
async function seedUser(phone: string, password: string, role = 'user', status = 1) {
  return repo(UserEntity).save(
    repo(UserEntity).create({ phone, password: bcrypt.hashSync(password, 10), nickname: '测试用户', role, status })
  );
}

describe('AuthService 认证', () => {
  let svc: AuthService;
  let jwt: JwtService;
  let redis: FakeRedis;

  beforeEach(() => {
    ({ svc, jwt, redis } = wireAuthService());
  });

  describe('验证码', () => {
    it('发送固定验证码 123456 并写入 Redis', async () => {
      const code = await svc.sendSmsCode('13800000001');
      expect(code).toBe('123456');
      expect(await redis.get('sms:code:13800000001')).toBe('123456');
    });

    it('验证码错误抛参数错误', async () => {
      await svc.sendSmsCode('13800000001');
      await expect(svc.verifySmsCode('13800000001', '000000')).rejects.toMatchObject({ code: 2001 });
    });

    it('验证通过后验证码一次性失效', async () => {
      await svc.sendSmsCode('13800000001');
      await svc.verifySmsCode('13800000001', '123456');
      expect(await redis.get('sms:code:13800000001')).toBeNull();
    });
  });

  describe('register 注册', () => {
    it('验证码未发送直接注册被拒', async () => {
      await expect(svc.register('13800000001', 'pass1234', '123456')).rejects.toMatchObject({ code: 2001 });
    });

    it('注册成功：密码加密存储 + 默认昵称取尾号', async () => {
      await svc.sendSmsCode('13800000001');
      const { userId } = await svc.register('13800000001', 'pass1234', '123456');
      const user = await repo(UserEntity)
        .createQueryBuilder('u')
        .addSelect('u.password')
        .where('u.id = :id', { id: userId })
        .getOne();
      expect(user!.password).not.toBe('pass1234');
      expect(bcrypt.compareSync('pass1234', user!.password)).toBe(true);
      expect(user!.nickname).toBe('游客0001');
      expect(user!.role).toBe('user');
    });

    it('自定义昵称生效', async () => {
      await svc.sendSmsCode('13800000002');
      const { userId } = await svc.register('13800000002', 'pass1234', '123456', '阿晶');
      const user = await repo(UserEntity).findOneBy({ id: userId });
      expect(user!.nickname).toBe('阿晶');
    });

    it('手机号重复注册抛业务错误', async () => {
      await svc.sendSmsCode('13800000001');
      await svc.register('13800000001', 'pass1234', '123456');
      await svc.sendSmsCode('13800000001');
      await expect(svc.register('13800000001', 'pass1234', '123456')).rejects.toMatchObject({ code: 3001 });
    });
  });

  describe('login 登录', () => {
    it('手机号不存在抛 1003', async () => {
      await expect(svc.login('13800000001', 'pass1234')).rejects.toMatchObject({ code: 1003 });
    });

    it('密码错误抛 1003', async () => {
      await seedUser('13800000001', 'pass1234');
      await expect(svc.login('13800000001', 'wrong')).rejects.toMatchObject({ code: 1003 });
    });

    it('封禁账号抛 1004', async () => {
      await seedUser('13800000001', 'pass1234', 'user', 0);
      await expect(svc.login('13800000001', 'pass1234')).rejects.toMatchObject({ code: 1004 });
    });

    it('登录成功：签发可验签的双 token 并更新最后登录时间', async () => {
      await seedUser('13800000001', 'pass1234');
      const tokens = await svc.login('13800000001', 'pass1234');
      expect(tokens.expiresIn).toBe(7200);
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
      const payload: any = jwt.verifySync(tokens.accessToken, JWT_SECRET);
      expect(payload.role).toBe('user');
      expect(payload.userId).toBeGreaterThan(0);
      const user = await repo(UserEntity).findOneBy({ phone: '13800000001' });
      expect(user!.lastLoginAt).not.toBeNull();
    });

    it('商家登录：payload 附带 merchantId 与模块类型', async () => {
      const user = await seedUser('13800000002', 'merchant123', 'merchant');
      await repo(MerchantEntity).save(
        repo(MerchantEntity).create({ userId: user.id, shopName: '苗银坊', moduleType: 'clothing', status: 1 })
      );
      const tokens = await svc.login('13800000002', 'merchant123');
      const payload: any = jwt.verifySync(tokens.accessToken, JWT_SECRET);
      expect(payload.role).toBe('merchant');
      expect(payload.merchantId).toBeGreaterThan(0);
      expect(payload.merchantType).toBe('clothing');
    });

    it('商家店铺已下线抛 1004', async () => {
      await seedUser('13800000002', 'merchant123', 'merchant');
      await expect(svc.login('13800000002', 'merchant123')).rejects.toMatchObject({ code: 1004 });
    });
  });

  describe('refresh 刷新', () => {
    it('合法 refreshToken 换发新 token', async () => {
      const tokens = svc.signTokens(1, 'user');
      const refreshed = await svc.refresh(tokens.refreshToken);
      const payload: any = jwt.verifySync(refreshed.accessToken, JWT_SECRET);
      expect(payload.userId).toBe(1);
    });

    it('非法 refreshToken 抛 1002', async () => {
      await expect(svc.refresh('bad-token')).rejects.toMatchObject({ code: 1002 });
    });
  });

  describe('profile 资料', () => {
    it('普通用户：手机号脱敏 + 无商家信息', async () => {
      const user = await seedUser('13800000001', 'pass1234');
      const profile = await svc.profile(user.id);
      expect(profile.phone).toBe('138****0001');
      expect(profile.merchant).toBeNull();
    });

    it('商家用户：附带店铺信息', async () => {
      const user = await seedUser('13800000002', 'merchant123', 'merchant');
      const merchant = await repo(MerchantEntity).save(
        repo(MerchantEntity).create({ userId: user.id, shopName: '苗银坊', moduleType: 'clothing' })
      );
      const profile = await svc.profile(user.id);
      expect(profile.merchant).toMatchObject({ id: merchant.id, shopName: '苗银坊', moduleType: 'clothing' });
    });

    it('修改资料后即时生效', async () => {
      const user = await seedUser('13800000001', 'pass1234');
      const profile = await svc.updateProfile(user.id, { nickname: '新昵称', bio: '热爱苗乡文化' });
      expect(profile.nickname).toBe('新昵称');
      expect(profile.bio).toBe('热爱苗乡文化');
    });
  });

  describe('changePassword 修改密码', () => {
    it('原密码错误抛 2001', async () => {
      const user = await seedUser('13800000001', 'pass1234');
      await expect(svc.changePassword(user.id, 'wrong', 'newpass1')).rejects.toMatchObject({ code: 2001 });
    });

    it('修改成功后新密码可登录、旧密码失效', async () => {
      const user = await seedUser('13800000001', 'pass1234');
      await svc.changePassword(user.id, 'pass1234', 'newpass1');
      await expect(svc.login('13800000001', 'newpass1')).resolves.toBeTruthy();
      await expect(svc.login('13800000001', 'pass1234')).rejects.toMatchObject({ code: 1003 });
    });
  });
});
