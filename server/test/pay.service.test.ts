import { PayService } from '../src/module/pay/pay.module';
import { OrderEntity, PayRecordEntity } from '../src/entity/order.entity';
import { ProductEntity, ProductSkuEntity } from '../src/entity/clothing.entity';
import { FinanceRecordEntity } from '../src/entity/platform.entity';
import { repo, makeService, wireOrderService } from './helpers/db';
import { OrderStatus, OrderType } from '../src/common/constants';

/** 组装 PayService：真实仓库 + 真实 OrderService */
function wirePayService(): PayService {
  const svc = makeService(PayService);
  svc.orderRepo = repo(OrderEntity);
  svc.payRepo = repo(PayRecordEntity);
  svc.orderService = wireOrderService();
  return svc;
}

/** 造一个待支付商品订单 */
async function seedPendingOrder(userId = 2) {
  const product = await repo(ProductEntity).save(
    repo(ProductEntity).create({ title: '测试银饰', categoryId: 1, merchantId: 1, mainImage: 'x.png', price: 100, stock: 10, sales: 0, status: 1 })
  );
  const sku = await repo(ProductSkuEntity).save(
    repo(ProductSkuEntity).create({ productId: product.id, specName: '默认', price: 100, stock: 10, status: 1 })
  );
  return wireOrderService().createOrder({
    userId, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 200,
    items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 2 }],
  });
}

describe('PayService 模拟支付', () => {
  let svc: PayService;

  beforeEach(() => {
    svc = wirePayService();
  });

  describe('createPay 创建支付', () => {
    it('订单不存在抛 3005', async () => {
      await expect(svc.createPay(2, 999)).rejects.toMatchObject({ code: 3005 });
    });

    it('已支付订单不可重复创建支付', async () => {
      const order = await seedPendingOrder();
      await repo(OrderEntity).update(order.id, { status: OrderStatus.PAID });
      await expect(svc.createPay(2, order.id)).rejects.toMatchObject({ code: 3001 });
    });

    it('生成支付单并返回二维码内容', async () => {
      const order = await seedPendingOrder();
      const pay = await svc.createPay(2, order.id);
      expect(pay.payNo).toMatch(/^PAY/);
      expect(pay.orderNo).toBe(order.orderNo);
      expect(pay.qrcodeContent).toContain(pay.payNo);
      const record = await repo(PayRecordEntity).findOneBy({ orderId: order.id });
      expect(record!.status).toBe(0);
      expect(record!.channel).toBe('mock_wxpay');
      expect(Number(record!.amount)).toBe(200);
    });

    it('重复创建复用未支付记录', async () => {
      const order = await seedPendingOrder();
      const first = await svc.createPay(2, order.id);
      const second = await svc.createPay(2, order.id);
      expect(second.payNo).toBe(first.payNo);
      expect(await repo(PayRecordEntity).count()).toBe(1);
    });
  });

  describe('mockScan 模拟扫码', () => {
    it('支付单不存在抛 3005', async () => {
      await expect(svc.mockScan(2, 'PAY000')).rejects.toMatchObject({ code: 3005 });
    });

    it('支付成功：支付单置已支付并触发订单回调', async () => {
      const order = await seedPendingOrder();
      const pay = await svc.createPay(2, order.id);
      const result = await svc.mockScan(2, pay.payNo);
      expect(result.paid).toBe(true);
      const record = await repo(PayRecordEntity).findOneBy({ payNo: pay.payNo });
      expect(record!.status).toBe(1);
      expect(record!.paidAt).not.toBeNull();
      const after = await repo(OrderEntity).findOneBy({ id: order.id });
      expect(after!.status).toBe(OrderStatus.PAID);
      expect(after!.payTime).not.toBeNull();
      // 回调触发财务记账
      const fin = await repo(FinanceRecordEntity).findOneBy({ orderId: order.id });
      expect(Number(fin!.merchantIncome)).toBe(190);
    });

    it('重复扫码支付抛 3001', async () => {
      const order = await seedPendingOrder();
      const pay = await svc.createPay(2, order.id);
      await svc.mockScan(2, pay.payNo);
      await expect(svc.mockScan(2, pay.payNo)).rejects.toMatchObject({ code: 3001 });
    });
  });

  describe('queryStatus 状态查询', () => {
    it('未支付返回 paid=false', async () => {
      const order = await seedPendingOrder();
      const status = await svc.queryStatus(2, order.id);
      expect(status.paid).toBe(false);
      expect(status.payNo).toBe('');
    });

    it('已支付返回支付单号与时间', async () => {
      const order = await seedPendingOrder();
      const pay = await svc.createPay(2, order.id);
      await svc.mockScan(2, pay.payNo);
      const status = await svc.queryStatus(2, order.id);
      expect(status.paid).toBe(true);
      expect(status.payNo).toBe(pay.payNo);
      expect(status.paidAt).not.toBeNull();
    });
  });
});
