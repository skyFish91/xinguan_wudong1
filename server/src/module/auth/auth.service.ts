import { Config, Inject, Provide } from '@midwayjs/core';
import { JwtService } from '@midwayjs/jwt';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { RedisService } from '@midwayjs/redis';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../../entity/user.entity';
import { MerchantEntity } from '../../entity/user.entity';
import { BizError } from '../../common/BizError';
import { maskPhone } from '../../common/mask';

/** 登录返回 token 结构 */
export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** 认证服务：验证码、注册、登录、JWT 签发 */
@Provide()
export class AuthService {
  @InjectEntityModel(UserEntity)
  userRepo: Repository<UserEntity>;

  @InjectEntityModel(MerchantEntity)
  merchantRepo: Repository<MerchantEntity>;

  @Inject()
  redis: RedisService;

  @Inject()
  jwtService: JwtService;

  @Config('jwt.secret')
  jwtSecret: string;

  /** 发送短信验证码（开发期固定 123456，存 Redis 5 分钟） */
  async sendSmsCode(phone: string): Promise<string> {
    const code = '123456';
    await this.redis.set(`sms:code:${phone}`, code, 'EX', 300);
    // 课程环境不真实发短信，日志输出
    return code;
  }

  /** 校验验证码 */
  async verifySmsCode(phone: string, code: string): Promise<void> {
    const saved = await this.redis.get(`sms:code:${phone}`);
    if (!saved || saved !== code) {
      throw BizError.param('验证码错误或已过期');
    }
    await this.redis.del(`sms:code:${phone}`);
  }

  /** 注册 */
  async register(phone: string, password: string, smsCode: string, nickname?: string) {
    await this.verifySmsCode(phone, smsCode);
    const exists = await this.userRepo.findOneBy({ phone });
    if (exists) {
      throw BizError.biz('该手机号已注册');
    }
    const user = this.userRepo.create({
      phone,
      password: bcrypt.hashSync(password, 10),
      nickname: nickname || `游客${phone.slice(-4)}`,
      role: 'user',
      status: 1,
    });
    await this.userRepo.save(user);
    return { userId: user.id };
  }

  /** 密码登录（游客/商家/管理员统一入口） */
  async login(phone: string, password: string): Promise<TokenResult> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.phone = :phone', { phone })
      .getOne();
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new BizError(1003, '手机号或密码错误');
    }
    if (user.status !== 1) {
      throw BizError.forbidden('账号已被封禁，请联系平台');
    }
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // 商家附加 merchantId / merchantType
    let merchantId: number | undefined;
    let merchantType: string | undefined;
    if (user.role === 'merchant') {
      const merchant = await this.merchantRepo.findOneBy({ userId: user.id, status: 1 });
      if (!merchant) {
        throw BizError.forbidden('商家店铺已下线');
      }
      merchantId = merchant.id;
      merchantType = merchant.moduleType;
    }
    return this.signTokens(user.id, user.role, merchantId, merchantType);
  }

  /** 签发双 token */
  signTokens(userId: number, role: string, merchantId?: number, merchantType?: string): TokenResult {
    const payload = { userId, role, merchantId, merchantType };
    const accessToken = this.jwtService.signSync(payload, this.jwtSecret, { expiresIn: '2h' });
    const refreshToken = this.jwtService.signSync(payload, this.jwtSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken, expiresIn: 7200 };
  }

  /** 刷新 token */
  async refresh(refreshToken: string): Promise<TokenResult> {
    let payload: any;
    try {
      payload = this.jwtService.verifySync(refreshToken, this.jwtSecret);
    } catch (err) {
      throw new BizError(1002, '登录已过期，请重新登录');
    }
    return this.signTokens(payload.userId, payload.role, payload.merchantId, payload.merchantType);
  }

  /** 当前用户信息（含商家信息） */
  async profile(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw BizError.unauthorized();
    }
    let merchant = null;
    if (user.role === 'merchant') {
      merchant = await this.merchantRepo.findOneBy({ userId });
    }
    return {
      id: user.id,
      phone: maskPhone(user.phone),
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      region: user.region,
      bio: user.bio,
      role: user.role,
      merchant: merchant
        ? {
            id: merchant.id,
            shopName: merchant.shopName,
            moduleType: merchant.moduleType,
          }
        : null,
    };
  }

  /** 修改资料 */
  async updateProfile(userId: number, dto: {
    nickname?: string;
    avatar?: string;
    gender?: number;
    region?: string;
    bio?: string;
  }) {
    const patch: Record<string, unknown> = {};
    if (dto.nickname !== undefined) patch.nickname = dto.nickname;
    if (dto.avatar !== undefined) patch.avatar = dto.avatar;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.region !== undefined) patch.region = dto.region;
    if (dto.bio !== undefined) patch.bio = dto.bio;
    await this.userRepo.update(userId, patch);
    return this.profile(userId);
  }

  /** 修改密码 */
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
      throw BizError.param('原密码错误');
    }
    await this.userRepo.update(userId, { password: bcrypt.hashSync(newPassword, 10) });
    return true;
  }
}
