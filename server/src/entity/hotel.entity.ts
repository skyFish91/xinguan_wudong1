import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 民宿（含入住须知字段） */
@Entity('t_homestay')
export class HomestayEntity {
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

  @Column({ name: 'style_tags',  length: 255, default: '' })
  styleTags: string;

  @Column({ name: 'facility_tags',  length: 255, default: '' })
  facilityTags: string;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'intro',  type: 'text', nullable: true })
  intro: string;

  @Column({ name: 'rating',  type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ name: 'check_in_time',  length: 20, default: '14:00' })
  checkInTime: string;

  @Column({ name: 'check_out_time',  length: 20, default: '12:00' })
  checkOutTime: string;

  @Column({ name: 'pet_policy',  type: 'tinyint', default: 0 })
  petPolicy: number;

  @Column({ name: 'has_breakfast',  type: 'tinyint', default: 1 })
  hasBreakfast: number;

  @Column({ name: 'deposit',  type: 'decimal', precision: 10, scale: 2, default: 0 })
  deposit: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 房型 */
@Entity('t_room_type')
export class RoomTypeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'homestay_id',  type: 'bigint', unsigned: true })
  homestayId: number;

  @Column({ name: 'name',  length: 100 })
  name: string;

  @Column({ name: 'bed_type',  length: 50, default: '' })
  bedType: string;

  @Column({ name: 'area',  type: 'decimal', precision: 6, scale: 1, nullable: true })
  area: number | null;

  @Column({ name: 'capacity',  type: 'int', default: 2 })
  capacity: number;

  @Column({ name: 'facilities',  length: 255, default: '' })
  facilities: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'stock',  type: 'int', default: 1 })
  stock: number;

  @Column({ name: 'main_image',  length: 255, default: '' })
  mainImage: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}

/** 房态日历（room+date 联合唯一，动态定价与预扣） */
@Entity('t_room_inventory')
export class RoomInventoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'room_type_id',  type: 'bigint', unsigned: true })
  roomTypeId: number;

  @Column({ name: 'inv_date',  type: 'date' })
  invDate: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'total',  type: 'int', default: 1 })
  total: number;

  @Column({ name: 'booked',  type: 'int', default: 0 })
  booked: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;
}
