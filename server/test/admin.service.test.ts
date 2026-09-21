import { AdminService } from '../src/module/admin/admin.module';
import * as bcrypt from 'bcryptjs';
import { UserEntity, MerchantEntity, MerchantApplyEntity, OperationLogEntity } from '../src/entity/user.entity';
import { OrderEntity, RefundRecordEntity } from '../src/entity/order.entity';
import {
  BannerEntity, ActivityBannerEntity, AnnouncementEntity, RecommendEntity, HotKeywordEntity, SensitiveWordEntity,
  FinanceRecordEntity, SettlementEntity, SystemConfigEntity, MessageEntity, VisitLogEntity,
} from '../src/entity/platform.entity';
import { repo, makeService, wireOrderService } from './helpers/db';
import { OrderStatus } from '../src/common/constants';

/** 内存版 Redis：满足 clearHomeCache 的 del */
class FakeRedis {
  deleted: string[] = [];
  async del(key: string) { this.deleted.push(key); }
}

/** 组装 AdminService */
function wireAdminService(): { svc: AdminService; redis: FakeRedis } {
  const svc = makeService(AdminService);
  svc.userRepo = repo(UserEntity);
  svc.merchantRepo = repo(MerchantEntity);
  svc.applyRepo = repo(MerchantApplyEntity);
  svc.orderRepo = repo(OrderEntity);
  svc.refundRepo = repo(RefundRecordEntity);
  svc.orderService = wireOrderService();
  svc.bannerRepo = repo(BannerEntity);
  svc.activityRepo = repo(ActivityBannerEntity);
  svc.announcementRepo = repo(AnnouncementEntity);
  svc.recommendRepo = repo(RecommendEntity);
  svc.messageRepo = repo(MessageEntity);
  svc.configRepo = repo(SystemConfigEntity);
  svc.sensitiveRepo = repo(SensitiveWordEntity);
  svc.financeRepo = repo(FinanceRecordEntity);
  svc.settlementRepo = repo(SettlementEntity);
  svc.hotKeywordRepo = repo(HotKeywordEntity);
  svc.visitLogRepo = repo(VisitLogEntity);
  svc.opLogRepo = repo(OperationLogEntity);
  const redis = new FakeRedis();
  svc.redis = redis as any;
  return { svc, redis };
}

/** 造普通用户 */
async function seedUser(phone: string, role = 'user', status = 1) {
  return repo(UserEntity).save(
    repo(UserEntity).create({ phone, password: 'hash', nickname: '用户', role, status })
  );
}

/** 造入驻申请 */
async function seedApply(userId: number, shopName = '苗银坊') {
  return repo(MerchantApplyEntity).save(
    repo(MerchantApplyEntity).create({
      userId, shopName, moduleType: 'clothing', contact: '张三', contactPhone: '13800000001', licenseNo: 'L123', status: 0,
    })
  );
}

/** 造财务记录并把创建时间拨到 T+7 之前 */
async function seedOldFinance(merchantId: number, income: number, orderId: number) {
  const record = await repo(FinanceRecordEntity).save(
    repo(FinanceRecordEntity).create({
      orderId, merchantId, orderAmount: 100, commissionRate: 0.05, commission: 5, merchantIncome: income, settleStatus: 0,
    })
  );
  await repo(FinanceRecordEntity).query(
    'UPDATE t_finance_record SET created_at = DATE_SUB(NOW(), INTERVAL 10 DAY) WHERE id = ?',
    [record.id]
  );
  return record;
}

describe('AdminService 平台管理', () => {
  let svc: AdminService;
  let redis: FakeRedis;

  beforeEach(() => {
    ({ svc, redis } = wireAdminService());
  });

  describe('dashboard 看板', () => {
    it('统计用户/订单/入驻申请数', async () => {
      await seedUser('13800000001');
      await seedUser('13800000002');
      const apply = await seedApply(1);
      const dash = await svc.dashboard();
      expect(dash.userCount).toBe(2);
      expect(dash.orderCount).toBe(0);
      expect(dash.pendingApplies).toBe(1);
      expect(dash.gmv).toBe(0);
      expect(apply).toBeTruthy();
    });

    it('GMV 只统计有效订单', async () => {
      const user = await seedUser('13800000001');
      const paid = await repo(OrderEntity).save(
        repo(OrderEntity).create({ orderNo: 'WD1', userId: user.id, orderType: 'goods', status: OrderStatus.PAID, totalAmount: 100, payAmount: 100 })
      );
      await repo(OrderEntity).save(
        repo(OrderEntity).create({ orderNo: 'WD2', userId: user.id, orderType: 'goods', status: OrderStatus.CANCELLED, totalAmount: 50, payAmount: 50 })
      );
      await repo(OrderEntity).save(
        repo(OrderEntity).create({ orderNo: 'WD3', userId: user.id, orderType: 'goods', status: OrderStatus.PENDING_PAY, totalAmount: 30, payAmount: 30 })
      );
      const dash = await svc.dashboard();
      expect(dash.gmv).toBe(100);
      expect(paid).toBeTruthy();
    });
  });

  describe('userList 用户管理', () => {
    it('关键词 + 角色过滤分页', async () => {
      await seedUser('13800000001');
      await seedUser('13800000002', 'merchant');
      const page = await svc.userList('', 'merchant', undefined, 1, 10);
      expect(page.total).toBe(1);
      expect(page.list[0].phone).toBe('13800000002');
    });
  });

  describe('toggleUserStatus 禁用解禁', () => {
    it('禁用用户并设置解禁时间', async () => {
      const user = await seedUser('13800000001');
      await svc.toggleUserStatus(user.id, 0, '2026-12-31 00:00:00');
      const after = await repo(UserEntity).findOneBy({ id: user.id });
      expect(after!.status).toBe(0);
      expect(after!.banUntil).not.toBeNull();
    });

    it('解禁清空 banUntil', async () => {
      const user = await seedUser('13800000001', 'user', 0);
      await svc.toggleUserStatus(user.id, 1);
      const after = await repo(UserEntity).findOneBy({ id: user.id });
      expect(after!.status).toBe(1);
      expect(after!.banUntil).toBeNull();
    });

    it('不能操作管理员账号', async () => {
      const admin = await seedUser('13800000000', 'admin');
      await expect(svc.toggleUserStatus(admin.id, 0)).rejects.toMatchObject({ code: 3001 });
    });

    it('用户不存在抛 3005', async () => {
      await expect(svc.toggleUserStatus(999, 0)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('resetPassword 重置密码', () => {
    it('重置为初始密码 123456 并写操作日志', async () => {
      const user = await seedUser('13800000001');
      await svc.resetPassword(1, user.id);
      const after = await repo(UserEntity)
        .createQueryBuilder('u')
        .addSelect('u.password')
        .where('u.id = :id', { id: user.id })
        .getOne();
      expect(bcrypt.compareSync('123456', after!.password)).toBe(true);
      const logs = await repo(OperationLogEntity).find();
      expect(logs).toHaveLength(1);
      expect(logs[0].opType).toBe('user');
      expect(logs[0].opObject).toContain('13800000001');
    });
  });

  describe('入驻审核', () => {
    it('审核通过：创建商家档案 + 用户升级为商家 + 站内消息', async () => {
      const user = await seedUser('13800000001');
      const apply = await seedApply(user.id, '苗银坊');
      const merchant = await svc.approveApply(1, apply.id);
      expect(merchant.shopName).toBe('苗银坊');
      expect(merchant.moduleType).toBe('clothing');
      expect((await repo(UserEntity).findOneBy({ id: user.id }))!.role).toBe('merchant');
      const after = await repo(MerchantApplyEntity).findOneBy({ id: apply.id });
      expect(after!.status).toBe(1);
      expect(after!.auditAdminId).toBe(1);
      expect(after!.auditAt).not.toBeNull();
      const msgs = await repo(MessageEntity).findBy({ userId: user.id });
      expect(msgs[0].title).toBe('商家入驻审核通过');
    });

    it('重复审核抛 3001', async () => {
      const user = await seedUser('13800000001');
      const apply = await seedApply(user.id);
      await svc.approveApply(1, apply.id);
      await expect(svc.approveApply(1, apply.id)).rejects.toMatchObject({ code: 3001 });
    });

    it('驳回：记录原因并通知', async () => {
      const user = await seedUser('13800000001');
      const apply = await seedApply(user.id);
      await svc.rejectApply(1, apply.id, '资质不全');
      const after = await repo(MerchantApplyEntity).findOneBy({ id: apply.id });
      expect(after!.status).toBe(2);
      expect(after!.rejectReason).toBe('资质不全');
      expect((await repo(UserEntity).findOneBy({ id: user.id }))!.role).toBe('user');
      const msgs = await repo(MessageEntity).findBy({ userId: user.id });
      expect(msgs[0].title).toBe('商家入驻审核未通过');
    });
  });

  describe('banner 运营', () => {
    it('新建横幅并清首页缓存', async () => {
      const banner = await svc.saveBanner({ title: '衣', imageUrl: '/a.svg', sort: 1, status: 1 });
      expect(banner.id).toBeGreaterThan(0);
      expect(redis.deleted).toContain('home:data');
    });

    it('更新已有横幅', async () => {
      const banner = await svc.saveBanner({ title: '衣', imageUrl: '/a.svg', sort: 1, status: 1 });
      const updated = await svc.saveBanner({ id: banner.id, title: '新标题', imageUrl: '/b.svg', sort: 2, status: 0 });
      expect(updated.title).toBe('新标题');
      expect(await repo(BannerEntity).count()).toBe(1);
    });

    it('切换上下架状态', async () => {
      const banner = await svc.saveBanner({ title: '衣', imageUrl: '/a.svg', sort: 1, status: 1 });
      const off = await svc.toggleBanner(banner.id);
      expect(off.status).toBe(0);
      const on = await svc.toggleBanner(banner.id);
      expect(on.status).toBe(1);
    });

    it('删除横幅并清缓存', async () => {
      const banner = await svc.saveBanner({ title: '衣', imageUrl: '/a.svg', sort: 1, status: 1 });
      await svc.deleteBanner(banner.id);
      expect(await repo(BannerEntity).count()).toBe(0);
      expect(redis.deleted).toContain('home:data');
    });
  });

  describe('generateSettlement T+7 结算', () => {
    it('无满周期记录返回 0', async () => {
      const result = await svc.generateSettlement();
      expect(result.generated).toBe(0);
    });

    it('按商家分组汇总并回写 settleStatus/settleNo', async () => {
      await seedOldFinance(1, 95, 1);
      await seedOldFinance(1, 90, 2);
      await seedOldFinance(2, 80, 3);
      const result = await svc.generateSettlement();
      expect(result.generated).toBe(2);
      const settlements = await repo(SettlementEntity).find({ order: { merchantId: 'ASC' } });
      expect(settlements).toHaveLength(2);
      expect(Number(settlements[0].amount)).toBe(185);
      expect(Number(settlements[1].amount)).toBe(80);
      expect(settlements.every(s => s.settleNo.startsWith('ST'))).toBe(true);
      const records = await repo(FinanceRecordEntity).find();
      expect(records.every(r => r.settleStatus === 1 && r.settleNo !== '')).toBe(true);
    });

    it('未满 7 天的记录不参与结算', async () => {
      await repo(FinanceRecordEntity).save(
        repo(FinanceRecordEntity).create({
          orderId: 1, merchantId: 1, orderAmount: 100, commissionRate: 0.05, commission: 5, merchantIncome: 95,
        })
      );
      const result = await svc.generateSettlement();
      expect(result.generated).toBe(0);
    });
  });

  describe('confirmSettlement 确认打款', () => {
    it('确认后状态置 1', async () => {
      await seedOldFinance(1, 95, 1);
      await svc.generateSettlement();
      const settlement = await repo(SettlementEntity).findOneBy({ merchantId: 1 });
      await svc.confirmSettlement(settlement!.id);
      expect((await repo(SettlementEntity).findOneBy({ id: settlement!.id }))!.status).toBe(1);
    });

    it('重复确认抛 3001', async () => {
      await seedOldFinance(1, 95, 1);
      await svc.generateSettlement();
      const settlement = await repo(SettlementEntity).findOneBy({ merchantId: 1 });
      await svc.confirmSettlement(settlement!.id);
      await expect(svc.confirmSettlement(settlement!.id)).rejects.toMatchObject({ code: 3001 });
    });
  });
});
