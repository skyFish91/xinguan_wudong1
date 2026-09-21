import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 用户（游客/商家/管理员统一，role 区分） */
@Entity('t_user')
export class UserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'phone',  length: 20 })
  phone: string;

  @Column({ name: 'password',  length: 100, select: false })
  password: string;

  @Column({ name: 'nickname',  length: 50, default: '' })
  nickname: string;

  @Column({ name: 'avatar',  length: 255, default: '' })
  avatar: string;

  @Column({ name: 'gender',  type: 'tinyint', default: 0 })
  gender: number;

  @Column({ name: 'region',  length: 100, default: '' })
  region: string;

  @Column({ name: 'bio',  length: 500, default: '' })
  bio: string;

  @Column({ name: 'role',  length: 20, default: 'user' })
  role: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'ban_until',  type: 'datetime', nullable: true })
  banUntil: Date | null;

  @Column({ name: 'last_login_at',  type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 收货地址 */
@Entity('t_user_address')
export class UserAddressEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'receiver',  length: 50 })
  receiver: string;

  @Column({ name: 'phone',  length: 20 })
  phone: string;

  @Column({ name: 'province',  length: 50 })
  province: string;

  @Column({ name: 'city',  length: 50 })
  city: string;

  @Column({ name: 'district',  length: 50 })
  district: string;

  @Column({ name: 'detail',  length: 200 })
  detail: string;

  @Column({ name: 'is_default',  type: 'tinyint', default: 0 })
  isDefault: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 商家 */
@Entity('t_merchant')
export class MerchantEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'shop_name',  length: 100 })
  shopName: string;

  @Column({ name: 'module_type',  length: 20 })
  moduleType: string;

  @Column({ name: 'contact',  length: 50, default: '' })
  contact: string;

  @Column({ name: 'contact_phone',  length: 20, default: '' })
  contactPhone: string;

  @Column({ name: 'license_no',  length: 50, default: '' })
  licenseNo: string;

  @Column({ name: 'id_card',  length: 30, default: '' })
  idCard: string;

  @Column({ name: 'materials',  type: 'text', nullable: true })
  materials: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'join_at',  type: 'datetime', nullable: true })
  joinAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 商家入驻申请 */
@Entity('t_merchant_apply')
export class MerchantApplyEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'shop_name',  length: 100 })
  shopName: string;

  @Column({ name: 'module_type',  length: 20 })
  moduleType: string;

  @Column({ name: 'contact',  length: 50 })
  contact: string;

  @Column({ name: 'contact_phone',  length: 20 })
  contactPhone: string;

  @Column({ name: 'license_no',  length: 50 })
  licenseNo: string;

  @Column({ name: 'materials',  type: 'text', nullable: true })
  materials: string;

  @Column({ name: 'status',  type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'reject_reason',  length: 255, default: '' })
  rejectReason: string;

  @Column({ name: 'audit_admin_id',  type: 'bigint', unsigned: true, nullable: true })
  auditAdminId: number | null;

  @Column({ name: 'audit_at',  type: 'datetime', nullable: true })
  auditAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 角色（RBAC） */
@Entity('t_role')
export class RoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'role_name',  length: 50 })
  roleName: string;

  @Column({ name: 'permissions',  type: 'text', nullable: true })
  permissions: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 操作日志 */
@Entity('t_operation_log')
export class OperationLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'operator_id',  type: 'bigint', unsigned: true })
  operatorId: number;

  @Column({ name: 'operator_name',  length: 50, default: '' })
  operatorName: string;

  @Column({ name: 'op_type',  length: 50 })
  opType: string;

  @Column({ name: 'op_object',  length: 255, default: '' })
  opObject: string;

  @Column({ name: 'op_content',  length: 500, default: '' })
  opContent: string;

  @Column({ name: 'ip',  length: 50, default: '' })
  ip: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
