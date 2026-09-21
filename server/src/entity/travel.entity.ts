import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 景区 */
@Entity('t_scenic')
export class ScenicEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'name',  length: 100 })
  name: string;

  @Column({ name: 'address',  length: 255 })
  address: string;

  @Column({ name: 'longitude',  type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ name: 'latitude',  type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ name: 'open_time',  length: 50, default: '08:00-18:00' })
  openTime: string;

  @Column({ name: 'intro',  type: 'text', nullable: true })
  intro: string;

  @Column({ name: 'detail',  type: 'text', nullable: true })
  detail: string;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'category',  length: 20, default: '人文古寨' })
  category: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 票种 */
@Entity('t_ticket_type')
export class TicketTypeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'scenic_id',  type: 'bigint', unsigned: true })
  scenicId: number;

  @Column({ name: 'name',  length: 50 })
  name: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'valid_rule',  length: 255, default: '当日有效' })
  validRule: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}

/** 票务分日期库存 */
@Entity('t_ticket_inventory')
export class TicketInventoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'ticket_type_id',  type: 'bigint', unsigned: true })
  ticketTypeId: number;

  @Column({ name: 'use_date',  type: 'date' })
  useDate: string;

  @Column({ name: 'total',  type: 'int', default: 100 })
  total: number;

  @Column({ name: 'sold',  type: 'int', default: 0 })
  sold: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}

/** 路线套餐 */
@Entity('t_route')
export class RouteEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true })
  merchantId: number;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'days',  type: 'int', default: 1 })
  days: number;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'themes',  length: 100, default: '' })
  themes: string;

  @Column({ name: 'included',  type: 'text', nullable: true })
  included: string;

  @Column({ name: 'notice',  type: 'text', nullable: true })
  notice: string;

  @Column({ name: 'depart_from',  length: 100, default: '乌东村游客中心' })
  departFrom: string;

  @Column({ name: 'dest',  length: 100 })
  dest: string;

  @Column({ name: 'hotel_standard',  length: 100, default: '' })
  hotelStandard: string;

  @Column({ name: 'meal_standard',  length: 100, default: '' })
  mealStandard: string;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'detail',  type: 'mediumtext', nullable: true })
  detail: string;

  @Column({ name: 'sales',  type: 'int', default: 0 })
  sales: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 路线行程 */
@Entity('t_route_itinerary')
export class RouteItineraryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'route_id',  type: 'bigint', unsigned: true })
  routeId: number;

  @Column({ name: 'day_no',  type: 'int' })
  dayNo: number;

  @Column({ name: 'description',  length: 1000 })
  description: string;

  @Column({ name: 'scenic',  length: 200, default: '' })
  scenic: string;

  @Column({ name: 'meal',  length: 200, default: '' })
  meal: string;

  @Column({ name: 'hotel',  length: 200, default: '' })
  hotel: string;

  @Column({ name: 'transport',  length: 200, default: '' })
  transport: string;
}

/** 电子票 */
@Entity('t_eticket')
export class EticketEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'ticket_order_id',  type: 'bigint', unsigned: true })
  ticketOrderId: number;

  @Column({ name: 'code',  length: 32 })
  code: string;

  @Column({ name: 'biz_type',  length: 20 })
  bizType: string;

  @Column({ name: 'biz_id',  type: 'bigint', unsigned: true })
  bizId: number;

  @Column({ name: 'use_date',  type: 'date' })
  useDate: string;

  @Column({ name: 'visitor_name',  length: 50, default: '' })
  visitorName: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'verify_at',  type: 'datetime', nullable: true })
  verifyAt: Date | null;

  @Column({ name: 'verify_by',  type: 'bigint', unsigned: true, nullable: true })
  verifyBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 交通攻略 */
@Entity('t_traffic_guide')
export class TrafficGuideEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'depart_from',  length: 100 })
  departFrom: string;

  @Column({ name: 'dest',  length: 100, default: '乌东村' })
  dest: string;

  @Column({ name: 'transport',  length: 50 })
  transport: string;

  @Column({ name: 'duration',  length: 50, default: '' })
  duration: string;

  @Column({ name: 'cost',  length: 50, default: '' })
  cost: string;

  @Column({ name: 'detail',  type: 'mediumtext', nullable: true })
  detail: string;

  @Column({ name: 'image',  length: 255, default: '' })
  image: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
