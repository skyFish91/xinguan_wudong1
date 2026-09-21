import { Body, Controller, Get, Inject, Param, Post, Provide, Put, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { CartItemEntity } from '../../entity/order.entity';
import { ProductSkuEntity, ProductEntity } from '../../entity/clothing.entity';
import { FarmProductEntity } from '../../entity/food.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, Min } from 'class-validator';
import { OrderService } from '../order/order.module';
import { OrderType } from '../../common/constants';

/** 加购 DTO：skuId 与 farmProductId 二选一 */
export class AddCartDTO {
  @IsInt()
  @Min(1, { message: '数量至少为 1' })
  quantity: number;
  skuId?: number;
  farmProductId?: number;
}

/** 结算 DTO：勾选的购物车条目 */
export class CheckoutDTO {
  @IsArray()
  @ArrayNotEmpty({ message: '请选择要结算的商品' })
  cartIds: number[];
}

/** 统一购物车服务：衣（SKU）+ 食（农产品）共用 */
@Provide()
export class CartService {
  @InjectEntityModel(CartItemEntity)
  cartRepo: Repository<CartItemEntity>;

  @InjectEntityModel(ProductSkuEntity)
  skuRepo: Repository<ProductSkuEntity>;

  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  @InjectEntityModel(FarmProductEntity)
  farmRepo: Repository<FarmProductEntity>;

  @Inject()
  orderService: OrderService;

  /** 购物车列表（含商品信息与库存校验、失效标记） */
  async list(userId: number) {
    const items = await this.cartRepo.find({ where: { userId }, order: { id: 'DESC' } });
    const result: any[] = [];
    for (const item of items) {
      if (item.skuId) {
        const sku = await this.skuRepo.findOneBy({ id: item.skuId });
        if (!sku) {
          result.push({ ...item, invalid: true, reason: '商品已删除' });
          continue;
        }
        const product = await this.productRepo.findOneBy({ id: sku.productId });
        const invalid = !product || product.status !== 1 || sku.status !== 1;
        const stockNotEnough = sku.stock < item.quantity;
        result.push({
          ...item,
          kind: 'sku',
          skuId: sku.id,
          productId: product?.id,
          title: product?.title || '商品不存在',
          specName: sku.specName,
          image: sku.image || product?.mainImage || '',
          price: sku.price,
          stock: sku.stock,
          invalid,
          stockNotEnough,
        });
      } else if (item.farmProductId) {
        const farm = await this.farmRepo.findOneBy({ id: item.farmProductId });
        if (!farm) {
          result.push({ ...item, invalid: true, reason: '商品已删除' });
          continue;
        }
        const invalid = farm.status !== 1;
        result.push({
          ...item,
          kind: 'farm',
          farmProductId: farm.id,
          title: farm.name,
          specName: farm.spec,
          image: farm.mainImage,
          price: farm.price,
          stock: farm.stock,
          invalid,
          stockNotEnough: farm.stock < item.quantity,
        });
      }
    }
    return result;
  }

  /** 加购 */
  async add(userId: number, dto: AddCartDTO) {
    if (!dto.skuId && !dto.farmProductId) {
      throw BizError.param('缺少商品参数');
    }
    if (dto.skuId) {
      const sku = await this.skuRepo.findOneBy({ id: dto.skuId, status: 1 });
      if (!sku) {
        throw BizError.notFound('商品规格不存在');
      }
      const product = await this.productRepo.findOneBy({ id: sku.productId, status: 1 });
      if (!product) {
        throw BizError.notFound('商品已下架');
      }
    } else if (dto.farmProductId) {
      const farm = await this.farmRepo.findOneBy({ id: dto.farmProductId, status: 1 });
      if (!farm) {
        throw BizError.notFound('农产品已下架');
      }
    }

    // 已存在则累加数量，否则新建
    const where: any = { userId, skuId: dto.skuId || null, farmProductId: dto.farmProductId || null };
    const exists = await this.cartRepo.findOneBy(where);
    if (exists) {
      exists.quantity += dto.quantity;
      await this.cartRepo.save(exists);
    } else {
      await this.cartRepo.save(this.cartRepo.create({ userId, ...dto }));
    }
    return this.list(userId);
  }

  /** 修改数量 */
  async updateQuantity(userId: number, id: number, quantity: number) {
    const item = await this.cartRepo.findOneBy({ id, userId });
    if (!item) {
      throw BizError.notFound('购物车条目不存在');
    }
    item.quantity = quantity;
    await this.cartRepo.save(item);
    return this.list(userId);
  }

  /** 删除条目 */
  async remove(userId: number, id: number) {
    await this.cartRepo.delete({ id, userId });
    return this.list(userId);
  }

  /** 清空 */
  async clear(userId: number) {
    await this.cartRepo.delete({ userId });
    return true;
  }

  /** 购物车数量（顶栏角标）；未登录（token 过期被守卫置空）时返回 0 */
  async count(userId: number | null): Promise<number> {
    if (!userId) {
      return 0;
    }
    return this.cartRepo.countBy({ userId });
  }

  /**
   * 结算：勾选条目 → 按商家拆单生成订单（库存预扣）→ 移除已结算条目
   */
  async checkout(userId: number, cartIds: number[]) {
    const items = await this.cartRepo
      .createQueryBuilder('c')
      .where('c.id IN (:...ids) AND c.user_id = :uid', { ids: cartIds, uid: userId })
      .getMany();
    if (items.length !== cartIds.length) {
      throw BizError.notFound('部分购物车条目不存在');
    }

    // 逐条校验在售与库存，并组装订单明细快照
    const detailList: any[] = [];
    for (const item of items) {
      if (item.skuId) {
        const sku = await this.skuRepo.findOneBy({ id: item.skuId, status: 1 });
        if (!sku) {
          throw BizError.biz(`商品规格已下架或删除`);
        }
        const product = await this.productRepo.findOneBy({ id: sku.productId, status: 1 });
        if (!product) {
          throw BizError.biz(`「${sku.specName}」所属商品已下架`);
        }
        if (sku.stock < item.quantity) {
          throw new BizError(3002, `「${product.title}」库存不足`);
        }
        detailList.push({
          skuId: sku.id,
          merchantId: product.merchantId,
          title: product.title,
          specName: sku.specName,
          image: sku.image || product.mainImage || '',
          price: Number(sku.price),
          quantity: item.quantity,
        });
      } else if (item.farmProductId) {
        const farm = await this.farmRepo.findOneBy({ id: item.farmProductId, status: 1 });
        if (!farm) {
          throw BizError.biz('农产品已下架');
        }
        if (farm.stock < item.quantity) {
          throw new BizError(3002, `「${farm.name}」库存不足`);
        }
        detailList.push({
          farmProductId: farm.id,
          merchantId: farm.merchantId,
          title: farm.name,
          specName: farm.spec,
          image: farm.mainImage || '',
          price: Number(farm.price),
          quantity: item.quantity,
        });
      }
    }

    // 按商家分组拆单
    const groups = new Map<number, any[]>();
    for (const d of detailList) {
      const key = d.merchantId || 0;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(d);
    }

    const orders: any[] = [];
    for (const [merchantId, groupItems] of groups) {
      const totalAmount = groupItems.reduce((sum, d) => sum + d.price * d.quantity, 0);
      const order = await this.orderService.createOrder({
        userId,
        orderType: OrderType.GOODS,
        merchantId: merchantId || undefined,
        totalAmount,
        items: groupItems.map(d => ({
          skuId: d.skuId,
          farmProductId: d.farmProductId,
          title: d.title,
          specName: d.specName,
          image: d.image,
          price: d.price,
          quantity: d.quantity,
        })),
      });
      orders.push(order);
    }

    // 全部成功后再移除已结算条目，避免下单失败时购物车被清空
    await this.cartRepo.delete({ id: In(cartIds) });
    return orders;
  }
}

@ApiTags(['公共-购物车'])
@Controller('/api/cart')
export class CartController {
  @Inject()
  cartService: CartService;

  @ApiOperation({ summary: '购物车列表（含失效与库存提示）' })
  @Auth()
  @Get('/')
  async list(@CurrentUserParam() user: CurrentUser) {
    return this.cartService.list(user.userId);
  }

  @ApiOperation({ summary: '加入购物车（skuId 或 farmProductId）' })
  @Auth()
  @Post('/add')
  async add(@Body() dto: AddCartDTO, @CurrentUserParam() user: CurrentUser) {
    return this.cartService.add(user.userId, dto);
  }

  @ApiOperation({ summary: '修改购物车条目数量' })
  @Auth()
  @Put('/:id')
  async update(
    @Param('id') id: number,
    @Body('quantity') quantity: number,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.cartService.updateQuantity(user.userId, Number(id), Number(quantity));
  }

  @ApiOperation({ summary: '删除购物车条目' })
  @Auth()
  @Post('/:id/remove')
  async remove(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.cartService.remove(user.userId, Number(id));
  }

  @ApiOperation({ summary: '清空购物车' })
  @Auth()
  @Post('/clear')
  async clear(@CurrentUserParam() user: CurrentUser) {
    return this.cartService.clear(user.userId);
  }

  @ApiOperation({ summary: '结算下单（按商家拆单）' })
  @Auth()
  @Post('/checkout')
  async checkout(@Body() dto: CheckoutDTO, @CurrentUserParam() user: CurrentUser) {
    return this.cartService.checkout(user.userId, dto.cartIds.map(id => Number(id)));
  }

  @ApiOperation({ summary: '购物车数量' })
  @Auth()
  @Get('/count')
  async count(@CurrentUserParam() user: CurrentUser | null) {
    // 未登录（含 token 过期被守卫置空）时返回 0，避免前端顶栏角标请求 500
    return this.cartService.count(user ? user.userId : null);
  }
}
