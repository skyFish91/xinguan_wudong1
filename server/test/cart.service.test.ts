import { CartService } from '../src/module/cart/cart.module';
import { OrderEntity, CartItemEntity } from '../src/entity/order.entity';
import { ProductEntity, ProductSkuEntity } from '../src/entity/clothing.entity';
import { FarmProductEntity } from '../src/entity/food.entity';
import { repo, makeService, wireOrderService } from './helpers/db';
import { OrderType } from '../src/common/constants';

/** 组装 CartService：真实仓库 + 真实 OrderService */
function wireCartService(): CartService {
  const svc = makeService(CartService);
  svc.cartRepo = repo(CartItemEntity);
  svc.skuRepo = repo(ProductSkuEntity);
  svc.productRepo = repo(ProductEntity);
  svc.farmRepo = repo(FarmProductEntity);
  svc.orderService = wireOrderService();
  return svc;
}

/** 造商品 + SKU（merchantId 用于拆单验证） */
async function seedSku(merchantId: number, stock: number, price = 100, status = 1) {
  const product = await repo(ProductEntity).save(
    repo(ProductEntity).create({
      title: `商家${merchantId}银饰`, categoryId: 1, merchantId, mainImage: 'x.png', price, stock, sales: 0, status,
    })
  );
  const sku = await repo(ProductSkuEntity).save(
    repo(ProductSkuEntity).create({ productId: product.id, specName: '默认', price, stock, status })
  );
  return { product, sku };
}

/** 造农产品 */
async function seedFarm(merchantId: number, stock: number, status = 1) {
  return repo(FarmProductEntity).save(
    repo(FarmProductEntity).create({
      categoryId: 1, merchantId, name: `商家${merchantId}腊肉`, price: 50, spec: '500g', stock, status,
    })
  );
}

describe('CartService 购物车', () => {
  let svc: CartService;

  beforeEach(() => {
    svc = wireCartService();
  });

  describe('add 加购', () => {
    it('加购 SKU 成功', async () => {
      const { sku } = await seedSku(1, 10);
      const list = await svc.add(2, { skuId: sku.id, quantity: 2 });
      expect(list).toHaveLength(1);
      expect(list[0].kind).toBe('sku');
      expect(list[0].title).toBe('商家1银饰');
      expect(list[0].quantity).toBe(2);
      expect(list[0].stock).toBe(10);
      expect(list[0].invalid).toBe(false);
    });

    it('同一 SKU 重复加购累加数量', async () => {
      const { sku } = await seedSku(1, 10);
      await svc.add(2, { skuId: sku.id, quantity: 1 });
      const list = await svc.add(2, { skuId: sku.id, quantity: 3 });
      expect(list).toHaveLength(1);
      expect(list[0].quantity).toBe(4);
      expect(await svc.count(2)).toBe(1);
    });

    it('缺少商品参数抛 2001', async () => {
      await expect(svc.add(2, { quantity: 1 } as any)).rejects.toMatchObject({ code: 2001 });
    });

    it('SKU 不存在抛 3005', async () => {
      await expect(svc.add(2, { skuId: 999, quantity: 1 })).rejects.toMatchObject({ code: 3005 });
    });

    it('商品已下架抛 3005', async () => {
      const { sku } = await seedSku(1, 10, 100, 0);
      await expect(svc.add(2, { skuId: sku.id, quantity: 1 })).rejects.toMatchObject({ code: 3005 });
    });

    it('加购农产品成功', async () => {
      const farm = await seedFarm(2, 20);
      const list = await svc.add(2, { farmProductId: farm.id, quantity: 2 });
      expect(list[0].kind).toBe('farm');
      expect(list[0].title).toBe('商家2腊肉');
    });
  });

  describe('list 状态标记', () => {
    it('库存不足标记 stockNotEnough', async () => {
      const { sku } = await seedSku(1, 2);
      await svc.add(2, { skuId: sku.id, quantity: 5 });
      const list = await svc.list(2);
      expect(list[0].stockNotEnough).toBe(true);
      expect(list[0].invalid).toBe(false);
    });

    it('商品下架标记 invalid', async () => {
      const { sku } = await seedSku(1, 10);
      await svc.add(2, { skuId: sku.id, quantity: 1 });
      await repo(ProductEntity).update({ id: sku.productId }, { status: 0 });
      const list = await svc.list(2);
      expect(list[0].invalid).toBe(true);
    });

    it('SKU 已删除标记 invalid 并给出原因', async () => {
      const { sku } = await seedSku(1, 10);
      await svc.add(2, { skuId: sku.id, quantity: 1 });
      await repo(ProductSkuEntity).delete({ id: sku.id });
      const list = await svc.list(2);
      expect(list[0].invalid).toBe(true);
      expect(list[0].reason).toBe('商品已删除');
    });
  });

  describe('updateQuantity / remove / clear', () => {
    it('修改数量', async () => {
      const { sku } = await seedSku(1, 10);
      const [item] = await svc.add(2, { skuId: sku.id, quantity: 1 });
      const list = await svc.updateQuantity(2, item.id, 7);
      expect(list[0].quantity).toBe(7);
    });

    it('条目不存在抛 3005', async () => {
      await expect(svc.updateQuantity(2, 999, 2)).rejects.toMatchObject({ code: 3005 });
    });

    it('删除条目并清空', async () => {
      const { sku } = await seedSku(1, 10);
      const [item] = await svc.add(2, { skuId: sku.id, quantity: 1 });
      expect(await svc.count(2)).toBe(1);
      await svc.remove(2, item.id);
      expect(await svc.count(2)).toBe(0);
      await svc.add(2, { skuId: sku.id, quantity: 1 });
      await svc.clear(2);
      expect(await svc.count(2)).toBe(0);
    });

    it('未登录（userId 为空）计数返回 0', async () => {
      // token 过期被守卫置空后，顶栏角标请求应返回 0 而非 500
      expect(await svc.count(null)).toBe(0);
    });
  });

  describe('checkout 结算', () => {
    it('单商家结算：生成一个商品订单并清空购物车', async () => {
      const { sku } = await seedSku(1, 10);
      const [item] = await svc.add(2, { skuId: sku.id, quantity: 2 });
      const orders = await svc.checkout(2, [item.id]);
      expect(orders).toHaveLength(1);
      expect(orders[0].orderType).toBe(OrderType.GOODS);
      expect(Number(orders[0].payAmount)).toBe(200);
      expect(await repo(OrderEntity).count()).toBe(1);
      expect(await repo(CartItemEntity).count()).toBe(0);
      const skuAfter = await repo(ProductSkuEntity).findOneBy({ id: sku.id });
      expect(skuAfter!.stock).toBe(8);
    });

    it('多商家拆单：每个商家一个订单', async () => {
      const a = await seedSku(1, 10);
      const b = await seedSku(2, 10);
      await svc.add(2, { skuId: a.sku.id, quantity: 1 });
      const [itemB] = await svc.add(2, { skuId: b.sku.id, quantity: 1 });
      const cart = await svc.list(2);
      const orders = await svc.checkout(2, cart.map(c => c.id));
      expect(orders).toHaveLength(2);
      expect(orders.map(o => o.merchantId).sort()).toEqual([1, 2]);
      expect(itemB).toBeTruthy();
    });

    it('SKU 与农产品混合按商家拆单', async () => {
      const { sku } = await seedSku(1, 10);
      const farm = await seedFarm(2, 20);
      await svc.add(2, { skuId: sku.id, quantity: 1 });
      await svc.add(2, { farmProductId: farm.id, quantity: 1 });
      const cart = await svc.list(2);
      const orders = await svc.checkout(2, cart.map(c => c.id));
      expect(orders).toHaveLength(2);
    });

    it('库存不足抛 3002 且购物车保留', async () => {
      const { sku } = await seedSku(1, 1);
      const [item] = await svc.add(2, { skuId: sku.id, quantity: 2 });
      await expect(svc.checkout(2, [item.id])).rejects.toMatchObject({ code: 3002 });
      expect(await repo(CartItemEntity).count()).toBe(1);
      expect(await repo(OrderEntity).count()).toBe(0);
    });

    it('商品已下架抛 3001', async () => {
      const { sku } = await seedSku(1, 10);
      const [item] = await svc.add(2, { skuId: sku.id, quantity: 1 });
      await repo(ProductEntity).update({ id: sku.productId }, { status: 0 });
      await expect(svc.checkout(2, [item.id])).rejects.toMatchObject({ code: 3001 });
    });

    it('部分条目不存在抛 3005', async () => {
      const { sku } = await seedSku(1, 10);
      const [item] = await svc.add(2, { skuId: sku.id, quantity: 1 });
      await expect(svc.checkout(2, [item.id, 999])).rejects.toMatchObject({ code: 3005 });
    });
  });
});
