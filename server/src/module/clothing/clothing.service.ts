import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { RedisService } from '@midwayjs/redis';
import {
  ProductCategoryEntity,
  ProductEntity,
  ProductSkuEntity,
  ProductImageEntity,
  InheritorEntity,
} from '../../entity/clothing.entity';
import { ReviewEntity, FavoriteEntity } from '../../entity/interaction.entity';
import { BizError } from '../../common/BizError';
import { PageResult } from '../../common/response';

/** 模块一 衣：非遗商品服务 */
@Provide()
export class ClothingService {
  @InjectEntityModel(ProductCategoryEntity)
  categoryRepo: Repository<ProductCategoryEntity>;

  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  @InjectEntityModel(ProductSkuEntity)
  skuRepo: Repository<ProductSkuEntity>;

  @InjectEntityModel(ProductImageEntity)
  imageRepo: Repository<ProductImageEntity>;

  @InjectEntityModel(InheritorEntity)
  inheritorRepo: Repository<InheritorEntity>;

  @InjectEntityModel(ReviewEntity)
  reviewRepo: Repository<ReviewEntity>;

  @InjectEntityModel(FavoriteEntity)
  favoriteRepo: Repository<FavoriteEntity>;

  @Inject()
  redis: RedisService;

  /** 分类树（一级+二级） */
  async categoryTree() {
    const all = await this.categoryRepo.find({ where: { status: 1 }, order: { sort: 'ASC' } });
    const roots = all.filter(c => c.parentId === 0);
    return roots.map(root => ({
      ...root,
      children: all.filter(c => c.parentId === root.id),
    }));
  }

  /** 商品列表（分类/关键词/价格区间/排序/分页） */
  async productList(params: {
    categoryId?: number;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string; // default/sales/price_asc/price_desc/rating
    page: number;
    pageSize: number;
  }): Promise<PageResult<ProductEntity>> {
    const qb = this.productRepo.createQueryBuilder('p').where('p.status = 1');

    if (params.categoryId) {
      // 含二级分类（传入一级时匹配其下所有二级）
      const children = await this.categoryRepo.findBy({ parentId: params.categoryId });
      const ids = [params.categoryId, ...children.map(c => c.id)];
      qb.andWhere('p.category_id IN (:...ids)', { ids });
    }
    if (params.keyword) {
      qb.andWhere('(p.title LIKE :kw OR p.subtitle LIKE :kw)', { kw: `%${params.keyword}%` });
    }
    if (params.minPrice !== undefined && params.minPrice !== null) {
      qb.andWhere('p.price >= :min', { min: params.minPrice });
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      qb.andWhere('p.price <= :max', { max: params.maxPrice });
    }

    switch (params.sort) {
      case 'sales':
        qb.orderBy('p.sales', 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('p.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('p.price', 'DESC');
        break;
      case 'rating':
        qb.orderBy('p.rating', 'DESC');
        break;
      default:
        qb.orderBy('p.id', 'DESC');
    }

    const [list, total] = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();
    return { list, total, page: params.page, pageSize: params.pageSize };
  }

  /** 商品详情（Redis 缓存 10 分钟） */
  async productDetail(id: number) {
    const cacheKey = `product:detail:${id}`;
    // 缓存是加速手段而非详情页的前置依赖：本地未配置 Redis 密码时仍应可浏览商品。
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis 不可用时回退到 MySQL，避免游客端显示“系统繁忙”。
    }
    const product = await this.productRepo.findOneBy({ id, status: 1 });
    if (!product) {
      throw BizError.notFound('商品不存在或已下架');
    }
    const [skus, images, inheritor, reviews] = await Promise.all([
      this.skuRepo.findBy({ productId: id, status: 1 }),
      this.imageRepo.find({ where: { productId: id }, order: { sort: 'ASC' } }),
      product.inheritorId ? this.inheritorRepo.findOneBy({ id: product.inheritorId }) : null,
      this.reviewRepo.find({
        where: { bizType: 'product', bizId: id, isHidden: 0 },
        order: { id: 'DESC' },
        take: 20,
      }),
    ]);
    const data = {
      ...product,
      skus,
      images: images.map(i => i.imageUrl),
      inheritor,
      reviews,
      reviewCount: reviews.length,
    };
    try {
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 600);
    } catch {
      // 缓存写入失败不影响商品详情返回。
    }
    return data;
  }

  /** 收藏/取消收藏 */
  async toggleFavorite(userId: number, bizType: string, bizId: number) {
    const exists = await this.favoriteRepo.findOneBy({ userId, bizType, bizId });
    if (exists) {
      await this.favoriteRepo.remove(exists);
      return { favorited: false };
    }
    await this.favoriteRepo.save(this.favoriteRepo.create({ userId, bizType, bizId }));
    return { favorited: true };
  }

  /** 是否已收藏 */
  async isFavorite(userId: number, bizType: string, bizId: number) {
    const exists = await this.favoriteRepo.findOneBy({ userId, bizType, bizId });
    return { favorited: !!exists };
  }

  /** 我的收藏聚合 */
  async myFavorites(userId: number, bizType: string, page: number, pageSize: number) {
    const where: any = { userId };
    if (bizType && bizType !== 'all') {
      where.bizType = bizType;
    }
    const [list, total] = await this.favoriteRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    // 展开收藏对象
    const result = [];
    for (const fav of list) {
      if (fav.bizType === 'product') {
        const product = await this.productRepo.findOneBy({ id: fav.bizId });
        if (product) {
          result.push({ ...fav, title: product.title, image: product.mainImage, price: product.price, subtitle: product.subtitle });
        }
      }
    }
    return { list: result, total, page, pageSize };
  }

  /** 发表评价（需已购，30 天内可追评） */
  async createReview(
    userId: number,
    dto: {
      orderId?: number;
      bizType: string;
      bizId: number;
      rating: number;
      content: string;
      images?: string;
    }
  ) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw BizError.param('评分须为 1-5 星');
    }
    const review = this.reviewRepo.create({
      orderId: dto.orderId || null,
      userId,
      bizType: dto.bizType,
      bizId: dto.bizId,
      rating: dto.rating,
      content: dto.content,
      images: dto.images || '',
    });
    await this.reviewRepo.save(review);
    // 更新商品评分（平均）
    if (dto.bizType === 'product') {
      const { avg } = await this.reviewRepo
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .where('r.biz_id = :id AND r.is_hidden = 0', { id: dto.bizId })
        .getRawOne();
      if (avg) {
        await this.productRepo.update(dto.bizId, { rating: Math.round(avg * 10) / 10 });
      }
    }
    return review;
  }

  /** 追评（评价后 30 天内） */
  async followUpReview(userId: number, reviewId: number, content: string) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId, userId });
    if (!review) {
      throw BizError.notFound('评价不存在');
    }
    if (review.followUp) {
      throw BizError.biz('已追评过');
    }
    const days = (Date.now() - new Date(review.createdAt).getTime()) / 86400000;
    if (days > 30) {
      throw BizError.biz('评价超过 30 天，无法追评');
    }
    review.followUp = content;
    await this.reviewRepo.save(review);
    return review;
  }

  /** 评价列表 */
  async reviewList(bizType: string, bizId: number, page: number, pageSize: number) {
    const [list, total] = await this.reviewRepo.findAndCount({
      where: { bizType, bizId, isHidden: 0 },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  /** 我的评价 */
  async myReviews(userId: number, page: number, pageSize: number) {
    const [list, total] = await this.reviewRepo.findAndCount({
      where: { userId },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }
}
