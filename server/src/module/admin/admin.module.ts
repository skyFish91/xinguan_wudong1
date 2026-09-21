import { Body, Controller, Get, Inject, Param, Post, Provide, Query, Patch } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { UserEntity, MerchantEntity, MerchantApplyEntity, OperationLogEntity } from '../../entity/user.entity';
import { OrderEntity, RefundRecordEntity } from '../../entity/order.entity';
import { OrderService } from '../order/order.module';
import {
  BannerEntity,
  ActivityBannerEntity,
  AnnouncementEntity,
  RecommendEntity,
  MessageEntity,
  SystemConfigEntity,
  SensitiveWordEntity,
  FinanceRecordEntity,
  SettlementEntity,
  HotKeywordEntity,
  VisitLogEntity,
} from '../../entity/platform.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { RedisService } from '@midwayjs/redis';
import * as bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { ProductEntity } from '../../entity/clothing.entity';
import { DishEntity } from '../../entity/food.entity';
import { HomestayEntity } from '../../entity/hotel.entity';
import { ScenicEntity } from '../../entity/travel.entity';

/** 模块六 平台管理后台 */
@Provide()
export class AdminService {
  @InjectEntityModel(UserEntity)
  userRepo: Repository<UserEntity>;

  @InjectEntityModel(MerchantEntity)
  merchantRepo: Repository<MerchantEntity>;

  @InjectEntityModel(MerchantApplyEntity)
  applyRepo: Repository<MerchantApplyEntity>;

  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(RefundRecordEntity)
  refundRepo: Repository<RefundRecordEntity>;

  @Inject()
  orderService: OrderService;

  @InjectEntityModel(BannerEntity)
  bannerRepo: Repository<BannerEntity>;

  @InjectEntityModel(ActivityBannerEntity)
  activityRepo: Repository<ActivityBannerEntity>;

  @InjectEntityModel(AnnouncementEntity)
  announcementRepo: Repository<AnnouncementEntity>;

  @InjectEntityModel(RecommendEntity)
  recommendRepo: Repository<RecommendEntity>;

  @InjectEntityModel(MessageEntity)
  messageRepo: Repository<MessageEntity>;

  @InjectEntityModel(SystemConfigEntity)
  configRepo: Repository<SystemConfigEntity>;

  @InjectEntityModel(SensitiveWordEntity)
  sensitiveRepo: Repository<SensitiveWordEntity>;

  @InjectEntityModel(FinanceRecordEntity)
  financeRepo: Repository<FinanceRecordEntity>;

  @InjectEntityModel(SettlementEntity)
  settlementRepo: Repository<SettlementEntity>;

  @InjectEntityModel(HotKeywordEntity)
  hotKeywordRepo: Repository<HotKeywordEntity>;

  @InjectEntityModel(VisitLogEntity)
  visitLogRepo: Repository<VisitLogEntity>;

  @InjectEntityModel(OperationLogEntity)
  opLogRepo: Repository<OperationLogEntity>;

  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  @InjectEntityModel(DishEntity)
  dishRepo: Repository<DishEntity>;

  @InjectEntityModel(HomestayEntity)
  homestayRepo: Repository<HomestayEntity>;

  @InjectEntityModel(ScenicEntity)
  scenicRepo: Repository<ScenicEntity>;

  @Inject()
  redis: RedisService;

  /** 运营配置变更后清首页缓存 */
  private async clearHomeCache(): Promise<void> {
    await this.redis.del('home:data');
  }

  // ---------- 数据看板 ----------
  async dashboard() {
    const today = dayjs().format('YYYY-MM-DD 00:00:00');
    const userCount = await this.userRepo.count();
    const todayUsers = await this.userRepo.createQueryBuilder('u').where('u.created_at >= :t', { t: today }).getCount();
    const orderCount = await this.orderRepo.count();
    const todayOrders = await this.orderRepo.createQueryBuilder('o').where('o.created_at >= :t', { t: today }).getCount();
    const gmv = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.pay_amount), 0)', 'total')
      .where('o.status >= 1 AND o.status NOT IN (5,7)')
      .getRawOne();
    const merchantCount = await this.merchantRepo.count();

    // 近7天用户趋势
    const sevenDaysAgo = dayjs().subtract(6, 'day').format('YYYY-MM-DD 00:00:00');
    const userTrend = await this.userRepo
      .createQueryBuilder('u')
      .select("DATE_FORMAT(u.created_at, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.created_at >= :t', { t: sevenDaysAgo })
      .groupBy("DATE_FORMAT(u.created_at, '%Y-%m-%d')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // 近7天订单趋势
    const orderTrend = await this.orderRepo
      .createQueryBuilder('o')
      .select("DATE_FORMAT(o.created_at, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('o.created_at >= :t', { t: sevenDaysAgo })
      .groupBy("DATE_FORMAT(o.created_at, '%Y-%m-%d')")
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      stats: {
        totalUsers: userCount,
        totalMerchants: merchantCount,
        totalOrders: orderCount,
        totalRevenue: Number(gmv?.total || 0),
        todayUsers,
        todayOrders,
      },
      userTrend: userTrend.map(item => ({
        date: item.date,
        count: Number(item.count || 0),
      })),
      orderTrend: orderTrend.map(item => ({
        date: item.date,
        count: Number(item.count || 0),
      })),
    };
  }

  // ---------- 用户管理 ----------
  async userList(keyword: string, role: string, status: number | undefined, page: number, pageSize: number) {
    const qb = this.userRepo.createQueryBuilder('u');
    if (keyword) {
      qb.where('(u.phone LIKE :kw OR u.nickname LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (role) {
      qb.andWhere('u.role = :role', { role });
    }
    if (status !== undefined && status >= 0) {
      qb.andWhere('u.status = :status', { status });
    }
    const [list, total] = await qb
      .orderBy('u.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 禁用/解禁用户（禁言至指定时间） */
  async toggleUserStatus(id: number, status: number, banUntil?: string) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw BizError.notFound('用户不存在');
    }
    if (user.role === 'admin') {
      throw BizError.biz('不能操作管理员账号');
    }
    user.status = status;
    user.banUntil = status === 0 ? (banUntil ? new Date(banUntil) : dayjs().add(7, 'day').toDate()) : null;
    return this.userRepo.save(user);
  }

  /** 重置用户密码为初始密码 */
  async resetPassword(operatorId: number, id: number) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw BizError.notFound('用户不存在');
    }
    user.password = bcrypt.hashSync('123456', 10);
    await this.userRepo.save(user);
    await this.opLogRepo.save(
      this.opLogRepo.create({
        operatorId,
        operatorName: 'admin',
        opType: 'user',
        opObject: `用户 ${user.phone}`,
        opContent: '重置密码为初始密码',
        ip: '',
      })
    );
    return true;
  }

  // ---------- 商家入驻审核 ----------
  async applyList(status: number | undefined, page: number, pageSize: number) {
    const qb = this.applyRepo.createQueryBuilder('a');
    if (status !== undefined && status >= 0) {
      qb.where('a.status = :status', { status });
    }
    const [list, total] = await qb
      .orderBy('a.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    if (list.length === 0) {
      return { list, total, page, pageSize };
    }
    const users = await this.userRepo.findBy({ id: In([...new Set(list.map(a => a.userId))] as number[]) });
    const userMap = new Map(users.map(u => [u.id, u]));
    return {
      list: list.map(a => ({ ...a, user: userMap.get(a.userId) || null })),
      total,
      page,
      pageSize,
    };
  }

  /** 审核通过：创建商家档案 + 用户升级为商家 */
  async approveApply(adminId: number, id: number) {
    const apply = await this.applyRepo.findOneBy({ id, status: 0 });
    if (!apply) {
      throw BizError.biz('申请不存在或已处理');
    }
    const merchant = await this.merchantRepo.save(
      this.merchantRepo.create({
        userId: apply.userId,
        shopName: apply.shopName,
        moduleType: apply.moduleType,
        contact: apply.contact,
        contactPhone: apply.contactPhone,
        licenseNo: apply.licenseNo,
        materials: apply.materials,
        status: 1,
        joinAt: new Date(),
      })
    );
    await this.userRepo.update({ id: apply.userId }, { role: 'merchant' });
    apply.status = 1;
    apply.auditAdminId = adminId;
    apply.auditAt = new Date();
    await this.applyRepo.save(apply);
    await this.messageRepo.save(
      this.messageRepo.create({
        userId: apply.userId,
        msgType: 'system',
        title: '商家入驻审核通过',
        content: `恭喜，您的店铺「${apply.shopName}」已通过平台审核，可登录商家后台开始经营。`,
      })
    );
    return merchant;
  }

  /** 审核驳回 */
  async rejectApply(adminId: number, id: number, reason: string) {
    const apply = await this.applyRepo.findOneBy({ id, status: 0 });
    if (!apply) {
      throw BizError.biz('申请不存在或已处理');
    }
    apply.status = 2;
    apply.rejectReason = reason || '资质不符合入驻要求';
    apply.auditAdminId = adminId;
    apply.auditAt = new Date();
    await this.applyRepo.save(apply);
    await this.messageRepo.save(
      this.messageRepo.create({
        userId: apply.userId,
        msgType: 'system',
        title: '商家入驻审核未通过',
        content: `您的入驻申请未通过审核，原因：${apply.rejectReason}`,
      })
    );
    return true;
  }

  // ---------- 首页运营 ----------
  async saveBanner(dto: any) {
    let saved: BannerEntity;
    if (dto.id) {
      const banner = await this.bannerRepo.findOneBy({ id: dto.id });
      if (!banner) {
        throw BizError.notFound('轮播图不存在');
      }
      Object.assign(banner, dto);
      saved = await this.bannerRepo.save(banner);
    } else {
      saved = await this.bannerRepo.save(this.bannerRepo.create(dto as Partial<BannerEntity>));
    }
    await this.clearHomeCache();
    return saved;
  }

  async bannerList() {
    return this.bannerRepo.find({ order: { sort: 'ASC', id: 'DESC' } });
  }

  async deleteBanner(id: number) {
    await this.bannerRepo.delete(id);
    await this.clearHomeCache();
    return true;
  }

  async toggleBanner(id: number) {
    const banner = await this.bannerRepo.findOneBy({ id });
    if (!banner) {
      throw BizError.notFound('轮播图不存在');
    }
    banner.status = banner.status === 1 ? 0 : 1;
    await this.bannerRepo.save(banner);
    await this.clearHomeCache();
    return banner;
  }

  async saveActivity(dto: any) {
    let saved: ActivityBannerEntity;
    if (dto.id) {
      const act = await this.activityRepo.findOneBy({ id: dto.id });
      if (!act) {
        throw BizError.notFound('活动横幅不存在');
      }
      Object.assign(act, dto);
      saved = await this.activityRepo.save(act);
    } else {
      saved = await this.activityRepo.save(this.activityRepo.create(dto as Partial<ActivityBannerEntity>));
    }
    await this.clearHomeCache();
    return saved;
  }

  async activityList() {
    return this.activityRepo.find({ order: { id: 'DESC' } });
  }

  async deleteActivity(id: number) {
    await this.activityRepo.delete(id);
    await this.clearHomeCache();
    return true;
  }

  async saveAnnouncement(dto: any) {
    let saved: AnnouncementEntity;
    if (dto.id) {
      const ann = await this.announcementRepo.findOneBy({ id: dto.id });
      if (!ann) {
        throw BizError.notFound('公告不存在');
      }
      Object.assign(ann, dto);
      saved = await this.announcementRepo.save(ann);
    } else {
      saved = await this.announcementRepo.save(this.announcementRepo.create(dto as Partial<AnnouncementEntity>));
    }
    await this.clearHomeCache();
    return saved;
  }

  async announcementList() {
    return this.announcementRepo.find({ order: { id: 'DESC' } });
  }

  async deleteAnnouncement(id: number) {
    await this.announcementRepo.delete(id);
    await this.clearHomeCache();
    return true;
  }

  async saveRecommend(dto: any) {
    let saved: RecommendEntity;
    if (dto.id) {
      const rec = await this.recommendRepo.findOneBy({ id: dto.id });
      if (!rec) {
        throw BizError.notFound('推荐位不存在');
      }
      Object.assign(rec, dto);
      saved = await this.recommendRepo.save(rec);
    } else {
      saved = await this.recommendRepo.save(this.recommendRepo.create(dto as Partial<RecommendEntity>));
    }
    await this.clearHomeCache();
    return saved;
  }

  async deleteRecommend(id: number) {
    await this.recommendRepo.delete(id);
    await this.clearHomeCache();
    return true;
  }

  async saveHotKeyword(dto: any) {
    if (dto.id) {
      const kw = await this.hotKeywordRepo.findOneBy({ id: dto.id });
      if (!kw) {
        throw BizError.notFound('热词不存在');
      }
      Object.assign(kw, dto);
      return this.hotKeywordRepo.save(kw);
    }
    return this.hotKeywordRepo.save(this.hotKeywordRepo.create(dto as Partial<HotKeywordEntity>));
  }

  async deleteHotKeyword(id: number) {
    await this.hotKeywordRepo.delete(id);
    return true;
  }

  // ---------- 消息中心 ----------
  /** 群发消息：target=all 全站用户 / role 按角色 / userId 单发 */
  async sendMessage(dto: { target: string; role?: string; userId?: number; title: string; content: string }) {
    let users: UserEntity[] = [];
    if (dto.target === 'all') {
      users = await this.userRepo.find();
    } else if (dto.target === 'role' && dto.role) {
      users = await this.userRepo.findBy({ role: dto.role });
    } else if (dto.target === 'user' && dto.userId) {
      users = await this.userRepo.findBy({ id: dto.userId });
    } else {
      throw BizError.param('发送对象无效');
    }
    if (users.length === 0) {
      throw BizError.biz('没有符合条件的用户');
    }
    const messages = users.map(u =>
      this.messageRepo.create({
        userId: u.id,
        msgType: 'system',
        title: dto.title,
        content: dto.content,
      })
    );
    await this.messageRepo.save(messages);
    return { sent: users.length };
  }

  // ---------- 财务结算 ----------
  async financeList(merchantId: number | undefined, settleStatus: number | undefined, page: number, pageSize: number) {
    const qb = this.financeRepo.createQueryBuilder('f');
    if (merchantId) {
      qb.where('f.merchant_id = :mid', { mid: merchantId });
    }
    if (settleStatus !== undefined && settleStatus >= 0) {
      qb.andWhere('f.settle_status = :ss', { ss: settleStatus });
    }
    const [list, total] = await qb
      .orderBy('f.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 生成结算单：T+7 周期，将 7 天前及更早的未结算财务记录按商家汇总 */
  async generateSettlement() {
    const cutoff = dayjs().subtract(7, 'day').format('YYYY-MM-DD 23:59:59');
    const pending = await this.financeRepo
      .createQueryBuilder('f')
      .where('f.settle_status = 0 AND f.created_at <= :cutoff', { cutoff })
      .getMany();
    if (pending.length === 0) {
      return { generated: 0, message: '暂无满 T+7 周期的待结算记录' };
    }
    // 按商家分组
    const groupMap = new Map<number, typeof pending>();
    for (const record of pending) {
      const arr = groupMap.get(record.merchantId) || [];
      arr.push(record);
      groupMap.set(record.merchantId, arr);
    }
    const created = [];
    for (const [merchantId, records] of groupMap) {
      const amount = records.reduce((sum, r) => sum + Number(r.merchantIncome), 0);
      const settleNo = 'ST' + dayjs().format('YYYYMMDDHHmmss') + String(merchantId).padStart(4, '0');
      const settlement = await this.settlementRepo.save(
        this.settlementRepo.create({
          settleNo,
          merchantId,
          amount: Math.round(amount * 100) / 100,
          periodStart: dayjs(cutoff).subtract(6, 'day').format('YYYY-MM-DD'),
          periodEnd: dayjs(cutoff).format('YYYY-MM-DD'),
          status: 0,
        })
      );
      await this.financeRepo.update(
        { id: In(records.map(r => r.id)) },
        { settleStatus: 1, settleNo }
      );
      created.push(settlement);
    }
    return { generated: created.length, list: created };
  }

  async settlementList(status: number | undefined, page: number, pageSize: number) {
    const qb = this.settlementRepo.createQueryBuilder('s');
    if (status !== undefined && status >= 0) {
      qb.where('s.status = :status', { status });
    }
    const [list, total] = await qb
      .orderBy('s.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    if (list.length === 0) {
      return { list, total, page, pageSize };
    }
    const merchants = await this.merchantRepo.findBy({ id: In([...new Set(list.map(s => s.merchantId))] as number[]) });
    const merchantMap = new Map(merchants.map(m => [m.id, m.shopName]));
    return {
      list: list.map(s => ({ ...s, shopName: merchantMap.get(s.merchantId) || '' })),
      total,
      page,
      pageSize,
    };
  }

  /** 结算单确认打款 */
  async confirmSettlement(id: number) {
    const settlement = await this.settlementRepo.findOneBy({ id, status: 0 });
    if (!settlement) {
      throw BizError.biz('结算单不存在或已处理');
    }
    settlement.status = 1;
    await this.settlementRepo.save(settlement);
    return true;
  }

  // ---------- 全局订单 ----------
  async orderList(status: number | undefined, orderType: string, keyword: string, page: number, pageSize: number) {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (status !== undefined && status >= 0) {
      qb.where('o.status = :status', { status });
    }
    if (orderType) {
      qb.andWhere('o.order_type = :ot', { ot: orderType });
    }
    if (keyword) {
      qb.andWhere('(o.order_no LIKE :kw OR o.remark LIKE :kw)', { kw: `%${keyword}%` });
    }
    const [list, total] = await qb
      .orderBy('o.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ---------- 系统设置 ----------
  async configList() {
    return this.configRepo.find();
  }

  async saveConfig(dto: any) {
    if (dto.id) {
      const config = await this.configRepo.findOneBy({ id: dto.id });
      if (!config) {
        throw BizError.notFound('配置不存在');
      }
      Object.assign(config, dto);
      return this.configRepo.save(config);
    }
    return this.configRepo.save(this.configRepo.create(dto as Partial<SystemConfigEntity>));
  }

  async sensitiveList() {
    return this.sensitiveRepo.find();
  }

  async addSensitiveWord(word: string) {
    const exists = await this.sensitiveRepo.findOneBy({ word });
    if (exists) {
      throw BizError.biz('该敏感词已存在');
    }
    return this.sensitiveRepo.save(this.sensitiveRepo.create({ word }));
  }

  async deleteSensitiveWord(id: number) {
    await this.sensitiveRepo.delete(id);
    return true;
  }

  // ---------- 商品管理 ----------
  async productList(type: string, keyword: string, status: number | undefined, page: number, pageSize: number) {
    let list = [];
    let total = 0;
    if (type === 'product' || !type) {
      const qb = this.productRepo.createQueryBuilder('p');
      if (keyword) {
        qb.where('p.title LIKE :kw', { kw: `%${keyword}%` });
      }
      if (status !== undefined && status >= 0) {
        qb.andWhere('p.status = :status', { status });
      }
      const [items, count] = await qb
        .orderBy('p.id', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
      list = items.map(p => ({ ...p, productType: 'product' }));
      total = count;
    } else if (type === 'dish') {
      const qb = this.dishRepo.createQueryBuilder('d');
      if (keyword) {
        qb.where('d.name LIKE :kw', { kw: `%${keyword}%` });
      }
      if (status !== undefined && status >= 0) {
        qb.andWhere('d.status = :status', { status });
      }
      const [items, count] = await qb
        .orderBy('d.id', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
      list = items.map(d => ({ ...d, productType: 'dish' }));
      total = count;
    } else if (type === 'homestay') {
      const qb = this.homestayRepo.createQueryBuilder('h');
      if (keyword) {
        qb.where('h.name LIKE :kw', { kw: `%${keyword}%` });
      }
      if (status !== undefined && status >= 0) {
        qb.andWhere('h.status = :status', { status });
      }
      const [items, count] = await qb
        .orderBy('h.id', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
      list = items.map(h => ({ ...h, productType: 'homestay' }));
      total = count;
    } else if (type === 'scenic') {
      const qb = this.scenicRepo.createQueryBuilder('s');
      if (keyword) {
        qb.where('s.name LIKE :kw', { kw: `%${keyword}%` });
      }
      if (status !== undefined && status >= 0) {
        qb.andWhere('s.status = :status', { status });
      }
      const [items, count] = await qb
        .orderBy('s.id', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
      list = items.map(s => ({ ...s, productType: 'scenic' }));
      total = count;
    }
    return { list, total, page, pageSize };
  }

  async toggleProductStatus(type: string, id: number, status: number) {
    if (type === 'product') {
      await this.productRepo.update({ id }, { status });
    } else if (type === 'dish') {
      await this.dishRepo.update({ id }, { status });
    } else if (type === 'homestay') {
      await this.homestayRepo.update({ id }, { status });
    } else if (type === 'scenic') {
      await this.scenicRepo.update({ id }, { status });
    }
    return true;
  }

  // ---------- 退款管理 ----------
  async refundList(status: number | undefined, page: number, pageSize: number) {
    const qb = this.refundRepo
      .createQueryBuilder('r')
      .leftJoin('t_order', 'o', 'o.id = r.order_id')
      .leftJoin('t_user', 'u', 'u.id = r.user_id')
      .select('r.*')
      .addSelect('o.order_no', 'orderNo')
      .addSelect('o.order_type', 'orderType')
      .addSelect('u.nickname', 'userNickname');
    if (status !== undefined) {
      qb.where('r.status = :status', { status });
    }
    qb.orderBy('r.id', 'DESC');
    const list = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawMany();
    const countQb = this.refundRepo.createQueryBuilder('r');
    if (status !== undefined) {
      countQb.where('r.status = :status', { status });
    }
    const total = await countQb.getCount();
    return { list, total, page, pageSize };
  }

  /** 退款审批：通过则回补库存、订单置已退款 */
  async handleRefund(refundId: number, approve: boolean, note: string) {
    return this.orderService.handleRefund(Number(refundId), approve, note);
  }
}

@ApiTags(['模块六-平台管理后台'])
@Controller('/api/admin')
export class AdminController {
  @Inject()
  adminService: AdminService;

  // ----- 看板 -----
  @ApiOperation({ summary: '数据看板总览' })
  @Auth('admin')
  @Get('/dashboard')
  async dashboard() {
    return this.adminService.dashboard();
  }

  // ----- 用户 -----
  @ApiOperation({ summary: '用户列表' })
  @Auth('admin')
  @Get('/users')
  async users(
    @Query('keyword') keyword: string,
    @Query('role') role: string,
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.userList(
      keyword,
      role,
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '禁用/解禁用户' })
  @Auth('admin')
  @Patch('/users/:id/status')
  async userStatus(@Param('id') id: number, @Body('status') status: number, @Body('banUntil') banUntil: string) {
    return this.adminService.toggleUserStatus(Number(id), Number(status), banUntil);
  }

  @ApiOperation({ summary: '重置用户密码' })
  @Auth('admin')
  @Post('/users/:id/reset-password')
  async resetPassword(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.resetPassword(user.userId, Number(id));
  }

  // ----- 商家审核 -----
  @ApiOperation({ summary: '商家入驻申请列表' })
  @Auth('admin')
  @Get('/merchant-applies')
  async applies(
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.applyList(
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '审核通过入驻申请' })
  @Auth('admin')
  @Post('/merchant-applies/:id/approve')
  async approve(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.approveApply(user.userId, Number(id));
  }

  @ApiOperation({ summary: '驳回入驻申请' })
  @Auth('admin')
  @Post('/merchant-applies/:id/reject')
  async reject(@Param('id') id: number, @Body('reason') reason: string, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.rejectApply(user.userId, Number(id), reason);
  }

  // ----- 首页运营 -----
  @ApiOperation({ summary: '轮播图列表（全部，含下架）' })
  @Auth('admin')
  @Get('/banners')
  async banners() {
    return this.adminService.bannerList();
  }

  @ApiOperation({ summary: '保存轮播图' })
  @Auth('admin')
  @Post('/banners/save')
  async saveBanner(@Body() dto: any) {
    return this.adminService.saveBanner(dto);
  }

  @ApiOperation({ summary: '删除轮播图' })
  @Auth('admin')
  @Post('/banners/:id/delete')
  async deleteBanner(@Param('id') id: number) {
    return this.adminService.deleteBanner(Number(id));
  }

  @ApiOperation({ summary: '轮播图上下架' })
  @Auth('admin')
  @Post('/banners/:id/toggle')
  async toggleBanner(@Param('id') id: number) {
    return this.adminService.toggleBanner(Number(id));
  }

  @ApiOperation({ summary: '活动横幅列表（全部，含下架）' })
  @Auth('admin')
  @Get('/activities')
  async activities() {
    return this.adminService.activityList();
  }

  @ApiOperation({ summary: '保存活动横幅' })
  @Auth('admin')
  @Post('/activities/save')
  async saveActivity(@Body() dto: any) {
    return this.adminService.saveActivity(dto);
  }

  @ApiOperation({ summary: '删除活动横幅' })
  @Auth('admin')
  @Post('/activities/:id/delete')
  async deleteActivity(@Param('id') id: number) {
    return this.adminService.deleteActivity(Number(id));
  }

  @ApiOperation({ summary: '公告列表（全部，含下架）' })
  @Auth('admin')
  @Get('/announcements')
  async announcements() {
    return this.adminService.announcementList();
  }

  @ApiOperation({ summary: '保存公告' })
  @Auth('admin')
  @Post('/announcements/save')
  async saveAnnouncement(@Body() dto: any) {
    return this.adminService.saveAnnouncement(dto);
  }

  @ApiOperation({ summary: '删除公告' })
  @Auth('admin')
  @Post('/announcements/:id/delete')
  async deleteAnnouncement(@Param('id') id: number) {
    return this.adminService.deleteAnnouncement(Number(id));
  }

  @ApiOperation({ summary: '保存推荐位' })
  @Auth('admin')
  @Post('/recommends/save')
  async saveRecommend(@Body() dto: any) {
    return this.adminService.saveRecommend(dto);
  }

  @ApiOperation({ summary: '删除推荐位' })
  @Auth('admin')
  @Post('/recommends/:id/delete')
  async deleteRecommend(@Param('id') id: number) {
    return this.adminService.deleteRecommend(Number(id));
  }

  @ApiOperation({ summary: '保存热搜词' })
  @Auth('admin')
  @Post('/hot-keywords/save')
  async saveHotKeyword(@Body() dto: any) {
    return this.adminService.saveHotKeyword(dto);
  }

  @ApiOperation({ summary: '删除热搜词' })
  @Auth('admin')
  @Post('/hot-keywords/:id/delete')
  async deleteHotKeyword(@Param('id') id: number) {
    return this.adminService.deleteHotKeyword(Number(id));
  }

  // ----- 消息中心 -----
  @ApiOperation({ summary: '群发消息（all/role/user）' })
  @Auth('admin')
  @Post('/messages/send')
  async sendMessage(@Body() dto: any) {
    return this.adminService.sendMessage(dto);
  }

  // ----- 财务 -----
  @ApiOperation({ summary: '财务记录列表' })
  @Auth('admin')
  @Get('/finances')
  async finances(
    @Query('merchantId') merchantId: number | undefined,
    @Query('settleStatus') settleStatus: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.financeList(
      merchantId ? Number(merchantId) : undefined,
      settleStatus === undefined || settleStatus === '' ? undefined : Number(settleStatus),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '生成 T+7 结算单' })
  @Auth('admin')
  @Post('/settlements/generate')
  async generateSettlement() {
    return this.adminService.generateSettlement();
  }

  @ApiOperation({ summary: '结算单列表' })
  @Auth('admin')
  @Get('/settlements')
  async settlements(
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.settlementList(
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '结算单确认打款' })
  @Auth('admin')
  @Post('/settlements/:id/confirm')
  async confirmSettlement(@Param('id') id: number) {
    return this.adminService.confirmSettlement(Number(id));
  }

  // ----- 全局订单 -----
  @ApiOperation({ summary: '全平台订单列表' })
  @Auth('admin')
  @Get('/orders')
  async orders(
    @Query('status') status: string | undefined,
    @Query('orderType') orderType: string,
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.orderList(
      status === undefined || status === '' ? undefined : Number(status),
      orderType,
      keyword,
      Number(page),
      Number(pageSize)
    );
  }

  // ----- 退款管理 -----
  @ApiOperation({ summary: '退款申请列表' })
  @Auth('admin')
  @Get('/refunds')
  async refunds(
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.refundList(
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '退款审批（approve=true 通过 / false 驳回）' })
  @Auth('admin')
  @Post('/refunds/:id/handle')
  async handleRefund(@Param('id') id: number, @Body('approve') approve: boolean, @Body('note') note: string) {
    return this.adminService.handleRefund(Number(id), approve, note);
  }

  // ----- 系统设置 -----
  @ApiOperation({ summary: '系统配置列表' })
  @Auth('admin')
  @Get('/configs')
  async configs() {
    return this.adminService.configList();
  }

  @ApiOperation({ summary: '保存系统配置' })
  @Auth('admin')
  @Post('/configs/save')
  async saveConfig(@Body() dto: any) {
    return this.adminService.saveConfig(dto);
  }

  @ApiOperation({ summary: '敏感词列表' })
  @Auth('admin')
  @Get('/sensitive-words')
  async sensitiveWords() {
    return this.adminService.sensitiveList();
  }

  @ApiOperation({ summary: '新增敏感词' })
  @Auth('admin')
  @Post('/sensitive-words/add')
  async addSensitiveWord(@Body('word') word: string) {
    return this.adminService.addSensitiveWord(word);
  }

  @ApiOperation({ summary: '删除敏感词' })
  @Auth('admin')
  @Post('/sensitive-words/:id/delete')
  async deleteSensitiveWord(@Param('id') id: number) {
    return this.adminService.deleteSensitiveWord(Number(id));
  }

  // ----- 商品管理 -----
  @ApiOperation({ summary: '商品列表（全平台）' })
  @Auth('admin')
  @Get('/products')
  async products(
    @Query('type') type: string,
    @Query('keyword') keyword: string,
    @Query('status') status: string | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.adminService.productList(
      type,
      keyword,
      status === undefined || status === '' ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '商品上下架' })
  @Auth('admin')
  @Post('/products/:type/:id/status')
  async productStatus(
    @Param('type') type: string,
    @Param('id') id: number,
    @Body('status') status: number
  ) {
    return this.adminService.toggleProductStatus(type, Number(id), Number(status));
  }
}
