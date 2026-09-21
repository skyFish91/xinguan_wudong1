import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 餐厅 */
@Entity('t_restaurant')
export class RestaurantEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'name',  length: 100 })
  name: string;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true })
  merchantId: number;

  @Column({ name: 'address',  length: 255 })
  address: string;

  @Column({ name: 'longitude',  type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ name: 'latitude',  type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ name: 'open_time',  length: 50, default: '11:00-21:00' })
  openTime: string;

  @Column({ name: 'capacity',  type: 'int', default: 50 })
  capacity: number;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'intro',  type: 'text', nullable: true })
  intro: string;

  @Column({ name: 'rating',  type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 菜品 */
@Entity('t_dish')
export class DishEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'restaurant_id',  type: 'bigint', unsigned: true })
  restaurantId: number;

  @Column({ name: 'name',  length: 100 })
  name: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'intro',  length: 500, default: '' })
  intro: string;

  @Column({ name: 'is_signature',  type: 'tinyint', default: 0 })
  isSignature: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}

/** 餐位时段 */
@Entity('t_meal_slot')
export class MealSlotEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'restaurant_id',  type: 'bigint', unsigned: true })
  restaurantId: number;

  @Column({ name: 'slot_name',  length: 50 })
  slotName: string;

  @Column({ name: 'max_booking',  type: 'int', default: 20 })
  maxBooking: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}

/** 餐位预订余量（restaurant+slot+date 维度） */
@Entity('t_meal_quota')
export class MealQuotaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'restaurant_id',  type: 'bigint', unsigned: true })
  restaurantId: number;

  @Column({ name: 'slot_id',  type: 'bigint', unsigned: true })
  slotId: number;

  @Column({ name: 'booking_date',  type: 'date' })
  bookingDate: string;

  @Column({ name: 'booked',  type: 'int', default: 0 })
  booked: number;
}

/** 农产品分类 */
@Entity('t_farm_category')
export class FarmCategoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'name',  length: 50 })
  name: string;

  @Column({ name: 'icon',  length: 255, default: '' })
  icon: string;

  @Column({ name: 'sort',  type: 'int', default: 0 })
  sort: number;
}

/** 农产品商品 */
@Entity('t_farm_product')
export class FarmProductEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'category_id',  type: 'bigint', unsigned: true })
  categoryId: number;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true })
  merchantId: number;

  @Column({ name: 'name',  length: 200 })
  name: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'spec',  length: 100, default: '' })
  spec: string;

  @Column({ name: 'stock',  type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'sales',  type: 'int', default: 0 })
  sales: number;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'origin',  length: 100, default: '' })
  origin: string;

  @Column({ name: 'shelf_life',  length: 50, default: '' })
  shelfLife: string;

  @Column({ name: 'detail',  type: 'mediumtext', nullable: true })
  detail: string;

  @Column({ name: 'freight',  type: 'decimal', precision: 10, scale: 2, default: 0 })
  freight: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
