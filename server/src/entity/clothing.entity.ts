import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** 商品分类（两级） */
@Entity('t_product_category')
export class ProductCategoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'name',  length: 50 })
  name: string;

  @Column({ name: 'parent_id',  type: 'bigint', unsigned: true, default: 0 })
  parentId: number;

  @Column({ name: 'icon',  length: 255, default: '' })
  icon: string;

  @Column({ name: 'sort',  type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 非遗传承人 */
@Entity('t_inheritor')
export class InheritorEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'name',  length: 50 })
  name: string;

  @Column({ name: 'title',  length: 100, default: '' })
  title: string;

  @Column({ name: 'craft',  length: 50, default: '' })
  craft: string;

  @Column({ name: 'story',  type: 'text', nullable: true })
  story: string;

  @Column({ name: 'avatar',  length: 255, default: '' })
  avatar: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 非遗商品 */
@Entity('t_product')
export class ProductEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'title',  length: 200 })
  title: string;

  @Column({ name: 'subtitle',  length: 200, default: '' })
  subtitle: string;

  @Column({ name: 'category_id',  type: 'bigint', unsigned: true })
  categoryId: number;

  @Column({ name: 'merchant_id',  type: 'bigint', unsigned: true })
  merchantId: number;

  @Column({ name: 'main_image',  length: 255 })
  mainImage: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'market_price',  type: 'decimal', precision: 10, scale: 2, nullable: true })
  marketPrice: number | null;

  @Column({ name: 'stock',  type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'sales',  type: 'int', default: 0 })
  sales: number;

  @Column({ name: 'rating',  type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ name: 'craft_intro',  type: 'text', nullable: true })
  craftIntro: string;

  @Column({ name: 'detail',  type: 'mediumtext', nullable: true })
  detail: string;

  @Column({ name: 'inheritor_id',  type: 'bigint', unsigned: true, nullable: true })
  inheritorId: number | null;

  @Column({ name: 'freight',  type: 'decimal', precision: 10, scale: 2, default: 0 })
  freight: number;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** 商品 SKU */
@Entity('t_product_sku')
export class ProductSkuEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id',  type: 'bigint', unsigned: true })
  productId: number;

  @Column({ name: 'spec_name',  length: 100 })
  specName: string;

  @Column({ name: 'price',  type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'stock',  type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'image',  length: 255, default: '' })
  image: string;

  @Column({ name: 'status',  type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/** 商品图片 */
@Entity('t_product_image')
export class ProductImageEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id',  type: 'bigint', unsigned: true })
  productId: number;

  @Column({ name: 'image_url',  length: 255 })
  imageUrl: string;

  @Column({ name: 'sort',  type: 'int', default: 0 })
  sort: number;
}
