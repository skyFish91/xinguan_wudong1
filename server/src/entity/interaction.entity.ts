import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 统一评价（商品/农产品/餐厅/民宿/票务） */
@Entity('t_review')
export class ReviewEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'order_id',  type: 'bigint', unsigned: true, nullable: true })
  orderId: number | null;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'biz_type',  length: 20 })
  bizType: string;

  @Column({ name: 'biz_id',  type: 'bigint', unsigned: true })
  bizId: number;

  @Column({ name: 'rating',  type: 'tinyint', default: 5 })
  rating: number;

  @Column({ name: 'content',  length: 1000 })
  content: string;

  @Column({ name: 'images',  type: 'text', nullable: true })
  images: string;

  @Column({ name: 'follow_up',  length: 1000, default: '' })
  followUp: string;

  @Column({ name: 'merchant_reply',  length: 1000, default: '' })
  merchantReply: string;

  @Column({ name: 'is_hidden',  type: 'tinyint', default: 0 })
  isHidden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 统一收藏（商品/餐厅/民宿/路线/游记） */
@Entity('t_favorite')
export class FavoriteEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'biz_type',  length: 20 })
  bizType: string;

  @Column({ name: 'biz_id',  type: 'bigint', unsigned: true })
  bizId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 点赞（游记/评论） */
@Entity('t_like')
export class LikeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id',  type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'target_type',  length: 20 })
  targetType: string;

  @Column({ name: 'target_id',  type: 'bigint', unsigned: true })
  targetId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
