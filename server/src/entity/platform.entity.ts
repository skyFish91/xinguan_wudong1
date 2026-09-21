import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 平台公告 */
@Entity('t_announcement')
export class AnnouncementEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'content',  type: 'text', nullable: true })
  content: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 首页轮播图 */
@Entity('t_banner')
export class BannerEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'title',  length: 100 })
  title: string;

  @Column({ name: 'image_url',  length: 255 })
  imageUrl: string;

  @Column({ name: 'link_url',  length: 255, default: '' })
  linkUrl: string;

  @Column({ name: 'sort',  type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 活动横幅 */
@Entity('t_activity_banner')
export class ActivityBannerEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'title',  length: 100 })
  title: string;

  @Column({ name: 'image_url',  length: 255 })
  imageUrl: string;

  @Column({ name: 'link_url',  length: 255, default: '' })
  linkUrl: string;

  @Column({ name: 'start_time',  type: 'datetime', nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time',  type: 'datetime', nullable: true })
  endTime: Date | null;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 推荐位 */
@Entity('t_recommend')
export class RecommendEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'slot_name',  length: 50 })
  slotName: string;

  @Column({ name: 'biz_type',  length: 20 })
  bizType: string;

  @Column({ name: 'biz_id',  type: 'bigint', unsigned: true })
  bizId: number;

  @Column({ name: 'sort',  type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}

/** 站内消息 */
@Entity('t_message')
export class MessageEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'msg_type',  length: 20 })
  msgType: string;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'content',  length: 1000, default: '' })
  content: string;

  @Column({ name: 'is_read',  type: 'tinyint', default: 0 })
  isRead: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 系统配置 */
@Entity('t_system_config')
export class SystemConfigEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'config_key',  length: 50 })
  configKey: string;

  @Column({ name: 'config_value',  length: 500 })
  configValue: string;

  @Column({ name: 'remark',  length: 200, default: '' })
  remark: string;
}

/** 敏感词库 */
@Entity('t_sensitive_word')
export class SensitiveWordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'word',  length: 100 })
  word: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 财务记录（平台抽佣记账） */
@Entity('t_finance_record')
export class FinanceRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true })
  merchantId: number;

  @Column({ name: 'order_amount',  type: 'decimal', precision: 10, scale: 2 })
  orderAmount: number;

  @Column({ name: 'commission_rate',  type: 'decimal', precision: 5, scale: 4, default: 0.05 })
  commissionRate: number;

  @Column({ name: 'commission',  type: 'decimal', precision: 10, scale: 2 })
  commission: number;

  @Column({ name: 'merchant_income',  type: 'decimal', precision: 10, scale: 2 })
  merchantIncome: number;

  @Column({ name: 'settle_status',  type: 'tinyint', default: 0 })
  settleStatus: number;

  @Column({ name: 'settle_no',  length: 32, default: '' })
  settleNo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 结算单 */
@Entity('t_settlement')
export class SettlementEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'settle_no',  length: 32 })
  settleNo: string;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true })
  merchantId: number;

  @Column({ name: 'amount',  type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'period_start',  type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end',  type: 'date' })
  periodEnd: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 访问日志（埋点 PV/UV） */
@Entity('t_visit_log')
export class VisitLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true, default: 0 })
  userId: number;

  @Column({ name: 'page',  length: 100, default: '' })
  page: string;

  @Column({ name: 'module',  length: 20, default: '' })
  module: string;

  @Column({ name: 'action',  length: 50, default: '' })
  action: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 搜索历史 */
@Entity('t_search_history')
export class SearchHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'keyword',  length: 100 })
  keyword: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 热搜词 */
@Entity('t_hot_keyword')
export class HotKeywordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'keyword',  length: 100 })
  keyword: string;

  @Column({ name: 'sort',  type: 'int', default: 0 })
  sort: number;
}
