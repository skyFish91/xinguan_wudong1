import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 统一订单主表（5 类订单） */
@Entity('t_order')
export class OrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_no',  length: 32 })
  orderNo: string;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true, nullable: true })
  merchantId: number | null;

  @Column({ name: 'order_type',  length: 20 })
  orderType: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'total_amount',  type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'pay_amount',  type: 'decimal', precision: 10, scale: 2, default: 0 })
  payAmount: number;

  @Column({ name: 'pay_time',  type: 'datetime', nullable: true })
  payTime: Date | null;

  @Column({ name: 'cancel_reason',  length: 255, default: '' })
  cancelReason: string;

  @Column({ name: 'remark',  length: 255, default: '' })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 商品订单明细（goods 类） */
@Entity('t_order_item')
export class OrderItemEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'sku_id',  type: 'bigint', unsigned: true, nullable: true })
  skuId: number | null;

  @Column({ name: 'farm_product_id',  type: 'bigint', unsigned: true, nullable: true })
  farmProductId: number | null;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'spec_name',  length: 100, default: '' })
  specName: string;

  @Column({ name: 'image',  length: 255, default: '' })
  image: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'quantity',  type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'shipping_status',  type: 'tinyint', default: 0 })
  shippingStatus: number;

  @Column({ name: 'logistics_no',  length: 50, default: '' })
  logisticsNo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 餐位预订扩展（meal 类） */
@Entity('t_meal_booking')
export class MealBookingEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'restaurant_id',  type: 'bigint', unsigned: true })
  restaurantId: number;

  @Column({ name: 'slot_id',  type: 'bigint', unsigned: true })
  slotId: number;

  @Column({ name: 'booking_date',  type: 'date' })
  bookingDate: string;

  @Column({ name: 'guest_count',  type: 'int' })
  guestCount: number;

  @Column({ name: 'contact_name',  length: 50 })
  contactName: string;

  @Column({ name: 'contact_phone',  length: 20 })
  contactPhone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 住宿预订扩展（hotel 类） */
@Entity('t_hotel_booking')
export class HotelBookingEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'homestay_id',  type: 'bigint', unsigned: true })
  homestayId: number;

  @Column({ name: 'room_type_id',  type: 'bigint', unsigned: true })
  roomTypeId: number;

  @Column({ name: 'check_in_date',  type: 'date' })
  checkInDate: string;

  @Column({ name: 'check_out_date',  type: 'date' })
  checkOutDate: string;

  @Column({ name: 'guest_name',  length: 50 })
  guestName: string;

  @Column({ name: 'guest_id_card',  length: 30 })
  guestIdCard: string;

  @Column({ name: 'guest_phone',  length: 20 })
  guestPhone: string;

  @Column({ name: 'nights',  type: 'int' })
  nights: number;

  @Column({ name: 'checkin_code',  length: 12 })
  checkinCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 票务订单扩展（ticket/route 类） */
@Entity('t_ticket_order')
export class TicketOrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'biz_type',  length: 20 })
  bizType: string;

  @Column({ name: 'biz_id',  type: 'bigint', unsigned: true })
  bizId: number;

  @Column({ name: 'use_date',  type: 'date' })
  useDate: string;

  @Column({ name: 'quantity',  type: 'int' })
  quantity: number;

  @Column({ name: 'visitors',  type: 'text', nullable: true })
  visitors: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 支付记录 */
@Entity('t_pay_record')
export class PayRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pay_no',  length: 32 })
  payNo: string;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'amount',  type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'channel',  length: 20, default: 'mock_wxpay' })
  channel: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'paid_at',  type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 退款记录 */
@Entity('t_refund_record')
export class RefundRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'refund_no',  length: 32 })
  refundNo: string;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'amount',  type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'reason',  length: 255, default: '' })
  reason: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'handle_note',  length: 255, default: '' })
  handleNote: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 统一购物车条目 */
@Entity('t_cart_item')
export class CartItemEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'sku_id',  type: 'bigint', unsigned: true, nullable: true })
  skuId: number | null;

  @Column({ name: 'farm_product_id',  type: 'bigint', unsigned: true, nullable: true })
  farmProductId: number | null;

  @Column({ name: 'quantity',  type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
