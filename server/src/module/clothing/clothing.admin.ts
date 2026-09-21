import { Body, Controller, Get, Inject, Param, Post, Provide, Put, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import {
  ProductCategoryEntity,
  ProductEntity,
  ProductSkuEntity,
  ProductImageEntity,
  InheritorEntity,
} from '../../entity/clothing.entity';
import { ReviewEntity } from '../../entity/interaction.entity';
import { OrderEntity, OrderItemEntity, RefundRecordEntity } from '../../entity/order.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderStatus, OrderType } from '../../common/constants';

/** 商品 DTO */
export class ProductDTO {
  title: string;
  subtitle?: string;
  categoryId: number;
  mainImage: string;
  price: number;
  marketPrice?: number;
  craftIntro?: string;
  detail?: string;
  inheritorId?: number;
  freight?: number;
  skus?: { specName: string; price: number; stock: number }[];
  images?: string[];
}

/** 模块一 衣：商家后台服务 */
@Provide()
export class ClothingAdminService {
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

  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(OrderItemEntity)
  orderItemRepo: Repository<OrderItemEntity>;

  @InjectEntityModel(RefundRecordEntity)
  refundRepo: Repository<RefundRecordEntity>;

  // ---------- 分类管理 ----------
  async saveCategory(dto: { id?: number; name: string; parentId?: number; icon?: string; sort?: number; status?: number }) {
    if (dto.id) {
      const cat = await this.categoryRepo.findOneBy({ id: dto.id });
      if (!cat) {
        throw BizError.notFound('分类不存在');
      }
      Object.assign(cat, dto);
      return this.categoryRepo.save(cat);
    }
    return this.categoryRepo.save(this.categoryRepo.create(dto as Partial<ProductCategoryEntity>));
  }

  async deleteCategory(id: number) {
    const children = await this.categoryRepo.countBy({ parentId: id });
    if (children > 0) {
      throw BizError.biz('请先删除二级分类');
    }
    const products = await this.productRepo.countBy({ categoryId: id });
    if (products > 0) {
      throw BizError.biz('该分类下存在商品，不可删除');
    }
    await this.categoryRepo.delete(id);
    return true;
  }

  // ---------- 商品管理 ----------
  async merchantProducts(merchantId: number, keyword: string, status: number | undefined, page: number, pageSize: number) {
    const where: any = { merchantId };
    if (status !== undefined && status >= 0) {
      where.status = status;
    }
    const qb = this.productRepo.createQueryBuilder('p').where('p.merchant_id = :mid', { mid: merchantId });
    if (status !== undefined && status >= 0) {
      qb.andWhere('p.status = :status', { status });
    }
    if (keyword) {
      qb.andWhere('p.title LIKE :kw', { kw: `%${keyword}%` });
    }
    const [list, total] = await qb
      .orderBy('p.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async saveProduct(merchantId: number, dto: ProductDTO & { id?: number }) {
    const images = (dto.images || []).map(url => url.trim()).filter(Boolean);
    const mainImage = dto.mainImage?.trim() || images[0];
    if (!mainImage) {
      throw BizError.param('请至少上传一张商品图片');
    }
    let product: ProductEntity;
    if (dto.id) {
      product = await this.productRepo.findOneBy({ id: dto.id, merchantId });
      if (!product) {
        throw BizError.notFound('商品不存在');
      }
      Object.assign(product, { ...dto, mainImage });
      await this.productRepo.save(product);
    } else {
      product = this.productRepo.create({
        ...dto,
        mainImage,
        merchantId,
        stock: dto.skus?.reduce((s, k) => s + k.stock, 0) || 0,
        price: dto.skus?.length ? Math.min(...dto.skus.map(k => k.price)) : dto.price,
      });
      await this.productRepo.save(product);
    }
    // SKU
    if (dto.skus && dto.skus.length > 0) {
      await this.skuRepo.delete({ productId: product.id });
      for (const sku of dto.skus) {
        await this.skuRepo.save(
          this.skuRepo.create({ productId: product.id, specName: sku.specName, price: sku.price, stock: sku.stock })
        );
      }
      const total = dto.skus.reduce((s, k) => s + k.stock, 0);
      const minPrice = Math.min(...dto.skus.map(k => k.price));
      await this.productRepo.update(product.id, { stock: total, price: minPrice });
    }
    // 图片
    if (dto.images) {
      await this.imageRepo.delete({ productId: product.id });
      for (let i = 0; i < images.length; i++) {
        await this.imageRepo.save(this.imageRepo.create({ productId: product.id, imageUrl: images[i], sort: i }));
      }
    }
    return product;
  }

  async productDetail(merchantId: number, id: number) {
    const product = await this.productRepo.findOneBy({ id, merchantId });
    if (!product) {
      throw BizError.notFound('商品不存在');
    }
    const [skus, images] = await Promise.all([
      this.skuRepo.find({ where: { productId: id }, order: { id: 'ASC' } }),
      this.imageRepo.find({ where: { productId: id }, order: { sort: 'ASC' } }),
    ]);
    return { ...product, skus, images: images.map(i => i.imageUrl) };
  }

  async toggleProductStatus(merchantId: number, id: number) {
    const product = await this.productRepo.findOneBy({ id, merchantId });
    if (!product) {
      throw BizError.notFound('商品不存在');
    }
    product.status = product.status === 1 ? 0 : 1;
    await this.productRepo.save(product);
    return product;
  }

  async deleteProduct(merchantId: number, id: number) {
    const product = await this.productRepo.findOneBy({ id, merchantId });
    if (!product) {
      throw BizError.notFound('商品不存在');
    }
    // 保留 SKU、图片与历史订单快照，避免破坏已成交订单的可追溯性。
    product.status = 0;
    await this.productRepo.save(product);
    return true;
  }

  /** SKU 库存调整（含预警 <10 返回预警列表） */
  async adjustStock(merchantId: number, skuId: number, stock: number) {
    const sku = await this.skuRepo.findOneBy({ id: skuId });
    if (!sku) {
      throw BizError.notFound('SKU 不存在');
    }
    const product = await this.productRepo.findOneBy({ id: sku.productId, merchantId });
    if (!product) {
      throw BizError.notFound('商品不存在');
    }
    sku.stock = stock;
    await this.skuRepo.save(sku);
    const total = await this.skuRepo
      .createQueryBuilder('s')
      .select('SUM(s.stock)', 'total')
      .where('s.product_id = :pid', { pid: sku.productId })
      .getRawOne();
    await this.productRepo.update(sku.productId, { stock: Number(total?.total || 0) });
    return sku;
  }

  /** 库存预警（<10，附带商品名） */
  async stockWarnings(merchantId: number) {
    const products = await this.productRepo.findBy({ merchantId });
    const productIds = products.map(p => p.id);
    if (!productIds.length) {
      return [];
    }
    const skus = await this.skuRepo
      .createQueryBuilder('s')
      .where('s.product_id IN (:...ids) AND s.stock < 10', { ids: productIds })
      .getMany();
    const titleMap = new Map(products.map(p => [p.id, p.title]));
    return skus.map(s => ({ ...s, productTitle: titleMap.get(s.productId) || '' }));
  }

  // ---------- 订单管理 ----------
  async merchantOrders(merchantId: number, status: number | undefined, page: number, pageSize: number) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :mid', { mid: merchantId })
      .andWhere('o.order_type = :type', { type: OrderType.GOODS });
    if (status !== undefined && status >= 0) {
      qb.andWhere('o.status = :status', { status });
    }
    const [list, total] = await qb
      .orderBy('o.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async orderDetail(merchantId: number, orderId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId, merchantId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    const items = await this.orderItemRepo.findBy({ orderId });
    const refund = await this.refundRepo.findOneBy({ orderId });
    return { ...order, items, refund };
  }

  // ---------- 评价管理 ----------
  async merchantReviews(merchantId: number, page: number, pageSize: number) {
    // 商家商品的评价
    const productIds = (await this.productRepo.findBy({ merchantId })).map(p => p.id);
    if (!productIds.length) {
      return { list: [], total: 0, page, pageSize };
    }
    const [list, total] = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.biz_type = :type AND r.biz_id IN (:...ids)', { type: 'product', ids: productIds })
      .orderBy('r.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async replyReview(merchantId: number, reviewId: number, reply: string) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) {
      throw BizError.notFound('评价不存在');
    }
    review.merchantReply = reply;
    await this.reviewRepo.save(review);
    return review;
  }

  async hideReview(merchantId: number, reviewId: number, hidden: boolean) {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) {
      throw BizError.notFound('评价不存在');
    }
    review.isHidden = hidden ? 1 : 0;
    await this.reviewRepo.save(review);
    return review;
  }

  // ---------- 数据统计 ----------
  async stats(merchantId: number) {
    // 销售额（已支付及以后状态）
    const orderAgg = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.pay_amount), 0)', 'sales')
      .addSelect('COUNT(*)', 'orders')
      .where('o.merchant_id = :mid AND o.status >= 1 AND o.status NOT IN (5, 7)', { mid: merchantId })
      .getRawOne();
    // 热销 TOP10
    const top = await this.orderItemRepo
      .createQueryBuilder('i')
      .innerJoin(OrderEntity, 'o', 'o.id = i.order_id')
      .where('o.merchant_id = :mid AND o.status >= 1', { mid: merchantId })
      .select('i.title', 'title')
      .addSelect('SUM(i.quantity)', 'quantity')
      .groupBy('i.title')
      .orderBy('quantity', 'DESC')
      .take(10)
      .getRawMany();
    const reviewCount = await this.reviewRepo.countBy({ bizType: 'product' });
    return {
      salesAmount: Number(orderAgg?.sales || 0),
      orderCount: Number(orderAgg?.orders || 0),
      topProducts: top,
      reviewCount,
      productCount: await this.productRepo.countBy({ merchantId }),
      lowStockCount: (await this.stockWarnings(merchantId)).length,
    };
  }
}

@ApiTags(['商家后台-衣'])
@Controller('/api/merchant/clothing')
export class ClothingAdminController {
  @Inject()
  adminService: ClothingAdminService;

  // ---------- 分类 ----------
  @ApiOperation({ summary: '分类管理（保存，id 为空新增）' })
  @Auth('merchant', 'admin')
  @Post('/categories/save')
  async saveCategory(@Body() dto: any) {
    return this.adminService.saveCategory(dto);
  }

  @ApiOperation({ summary: '删除分类' })
  @Auth('merchant', 'admin')
  @Post('/categories/:id/delete')
  async deleteCategory(@Param('id') id: number) {
    return this.adminService.deleteCategory(Number(id));
  }

  // ---------- 商品 ----------
  @ApiOperation({ summary: '我的商品列表' })
  @Auth('merchant')
  @Get('/products')
  async products(
    @Query('keyword') keyword: string,
    @Query('status') status: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.adminService.merchantProducts(
      user.merchantId,
      keyword,
      status === undefined ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '商品详情（含 SKU 与图片，编辑回显）' })
  @Auth('merchant')
  @Get('/products/:id')
  async productDetail(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.productDetail(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '新增/编辑商品（含 SKU 与图片）' })
  @Auth('merchant')
  @Post('/products/save')
  async saveProduct(@Body() dto: ProductDTO & { id?: number }, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.saveProduct(user.merchantId, dto);
  }

  @ApiOperation({ summary: '商品上下架' })
  @Auth('merchant')
  @Post('/products/:id/toggle')
  async toggleProduct(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.toggleProductStatus(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '删除商品' })
  @Auth('merchant')
  @Post('/products/:id/delete')
  async deleteProduct(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.deleteProduct(user.merchantId, Number(id));
  }

  // ---------- 库存 ----------
  @ApiOperation({ summary: 'SKU 库存调整' })
  @Auth('merchant')
  @Post('/skus/:id/stock')
  async adjustStock(@Param('id') id: number, @Body('stock') stock: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.adjustStock(user.merchantId, Number(id), Number(stock));
  }

  @ApiOperation({ summary: '库存预警列表（<10）' })
  @Auth('merchant')
  @Get('/stock-warnings')
  async stockWarnings(@CurrentUserParam() user: CurrentUser) {
    return this.adminService.stockWarnings(user.merchantId);
  }

  // ---------- 订单 ----------
  @ApiOperation({ summary: '商品订单列表' })
  @Auth('merchant')
  @Get('/orders')
  async orders(
    @Query('status') status: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.adminService.merchantOrders(
      user.merchantId,
      status === undefined ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '订单详情' })
  @Auth('merchant')
  @Get('/orders/:id')
  async orderDetail(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.orderDetail(user.merchantId, Number(id));
  }

  // ---------- 评价 ----------
  @ApiOperation({ summary: '商品评价列表' })
  @Auth('merchant')
  @Get('/reviews')
  async reviews(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.adminService.merchantReviews(user.merchantId, Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '回复评价' })
  @Auth('merchant')
  @Post('/reviews/:id/reply')
  async reply(@Param('id') id: number, @Body('reply') reply: string, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.replyReview(user.merchantId, Number(id), reply);
  }

  @ApiOperation({ summary: '隐藏/显示评价' })
  @Auth('merchant')
  @Post('/reviews/:id/hide')
  async hide(@Param('id') id: number, @Body('hidden') hidden: boolean, @CurrentUserParam() user: CurrentUser) {
    return this.adminService.hideReview(user.merchantId, Number(id), !!hidden);
  }

  // ---------- 统计 ----------
  @ApiOperation({ summary: '店铺数据统计（销售额/订单/热销TOP10/库存预警）' })
  @Auth('merchant')
  @Get('/stats')
  async stats(@CurrentUserParam() user: CurrentUser) {
    return this.adminService.stats(user.merchantId);
  }
}
