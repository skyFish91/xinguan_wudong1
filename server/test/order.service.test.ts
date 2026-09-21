import { OrderService } from '../src/module/order/order.module';
import { BizError } from '../src/common/BizError';
import { OrderStatus, OrderType } from '../src/common/constants';
import { repo, wireOrderService } from './helpers/db';
import {
  OrderEntity, OrderItemEntity, MealBookingEntity, HotelBookingEntity,
  TicketOrderEntity, RefundRecordEntity,
} from '../src/entity/order.entity';
import { ProductEntity, ProductSkuEntity } from '../src/entity/clothing.entity';
import { FarmProductEntity, MealSlotEntity, MealQuotaEntity } from '../src/entity/food.entity';
import { RoomInventoryEntity } from '../src/entity/hotel.entity';
import { TicketInventoryEntity, RouteEntity, EticketEntity } from '../src/entity/travel.entity';
import { FinanceRecordEntity, SystemConfigEntity, MessageEntity } from '../src/entity/platform.entity';

/** 造商品 + SKU */
async function seedSku(stock: number) {
  const product = await repo(ProductEntity).save(
    repo(ProductEntity).create({ title: '测试银饰', categoryId: 1, merchantId: 1, mainImage: 'x.png', price: 100, stock, sales: 0, status: 1 })
  );
  const sku = await repo(ProductSkuEntity).save(
    repo(ProductSkuEntity).create({ productId: product.id, specName: '默认', price: 100, stock, status: 1 })
  );
  return { product, sku };
}

/** 造农产品 */
async function seedFarm(stock: number) {
  return repo(FarmProductEntity).save(
    repo(FarmProductEntity).create({ categoryId: 1, merchantId: 1, name: '雷山腊肉', price: 50, stock, status: 1 })
  );
}

/** 造时段（maxBooking 控制满员） */
async function seedSlot(maxBooking: number) {
  return repo(MealSlotEntity).save(
    repo(MealSlotEntity).create({ restaurantId: 1, slotName: '午餐', maxBooking, status: 1 })
  );
}

/** 造两晚房态 */
async function seedRooms(roomTypeId: number, checkIn: string, nights: number, total: number, booked = 0) {
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + i);
    const invDate = d.toISOString().slice(0, 10);
    await repo(RoomInventoryEntity).save(
      repo(RoomInventoryEntity).create({ roomTypeId, invDate, price: 300, total, booked, status: 1 })
    );
  }
}

/** 造票库存 */
async function seedTicket(ticketTypeId: number, useDate: string, total: number) {
  return repo(TicketInventoryEntity).save(
    repo(TicketInventoryEntity).create({ ticketTypeId, useDate, total, sold: 0, status: 1 })
  );
}

describe('OrderService 订单核心', () => {
  let svc: OrderService;

  beforeEach(() => {
    svc = wireOrderService();
  });

  describe('genOrderNo', () => {
    it('格式 WD + 时间戳 + 4 位随机数', () => {
      const no = svc.genOrderNo();
      expect(no).toMatch(/^WD\d{14}\d{4}$/);
    });
  });

  describe('createOrder 商品类', () => {
    it('创建成功：预扣 SKU 库存并落明细', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 200,
        items: [{ skuId: sku.id, title: '测试银饰', specName: '默认', price: 100, quantity: 2 }],
      });
      expect(order.status).toBe(OrderStatus.PENDING_PAY);
      expect(order.orderNo).toMatch(/^WD/);
      expect(Number(order.payAmount)).toBe(200);
      const after = await repo(ProductSkuEntity).findOneBy({ id: sku.id });
      expect(after!.stock).toBe(8);
      const items = await repo(OrderItemEntity).findBy({ orderId: order.id });
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('测试银饰');
      expect(items[0].quantity).toBe(2);
    });

    it('SKU 库存不足抛 3002 且不落订单', async () => {
      const { sku } = await seedSku(1);
      await expect(
        svc.createOrder({
          userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 200,
          items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 2 }],
        })
      ).rejects.toThrow(BizError);
      await expect(
        svc.createOrder({
          userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 200,
          items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 2 }],
        })
      ).rejects.toMatchObject({ code: 3002 });
      expect(await repo(OrderEntity).count()).toBe(0);
    });

    it('农产品库存不足抛 3002', async () => {
      const farm = await seedFarm(0);
      await expect(
        svc.createOrder({
          userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 50,
          items: [{ farmProductId: farm.id, title: '雷山腊肉', price: 50, quantity: 1 }],
        })
      ).rejects.toMatchObject({ code: 3002 });
    });
  });

  describe('createOrder 餐位预订', () => {
    it('无余量记录时新建 booked=1', async () => {
      const slot = await seedSlot(20);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.MEAL, merchantId: 2, totalAmount: 60,
        mealBooking: { restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10', guestCount: 2, contactName: '张三', contactPhone: '13800000001' },
      });
      const quota = await repo(MealQuotaEntity).findOneBy({ restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10' });
      expect(quota!.booked).toBe(1);
      const booking = await repo(MealBookingEntity).findOneBy({ orderId: order.id });
      expect(booking!.guestCount).toBe(2);
    });

    it('餐位已满抛 3002', async () => {
      const slot = await seedSlot(1);
      await repo(MealQuotaEntity).save(
        repo(MealQuotaEntity).create({ restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10', booked: 1 })
      );
      await expect(
        svc.createOrder({
          userId: 2, orderType: OrderType.MEAL, merchantId: 2, totalAmount: 60,
          mealBooking: { restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10', guestCount: 2, contactName: '张三', contactPhone: '13800000001' },
        })
      ).rejects.toMatchObject({ code: 3002 });
    });
  });

  describe('createOrder 住宿预订', () => {
    it('逐日预扣房态', async () => {
      await seedRooms(1, '2026-09-10', 2, 5);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.HOTEL, merchantId: 3, totalAmount: 600,
        hotelBooking: {
          homestayId: 1, roomTypeId: 1, checkInDate: '2026-09-10', checkOutDate: '2026-09-12',
          guestName: '李四', guestIdCard: '522601199001011234', guestPhone: '13800000001', nights: 2,
        },
      });
      const invs = await repo(RoomInventoryEntity).find({ where: { roomTypeId: 1 }, order: { invDate: 'ASC' } });
      expect(invs.map(i => i.booked)).toEqual([1, 1]);
      const booking = await repo(HotelBookingEntity).findOneBy({ orderId: order.id });
      expect(booking!.checkinCode).toMatch(/^\d{6}$/);
    });

    it('满房抛 3002', async () => {
      await seedRooms(1, '2026-09-10', 1, 1, 1);
      await expect(
        svc.createOrder({
          userId: 2, orderType: OrderType.HOTEL, merchantId: 3, totalAmount: 300,
          hotelBooking: {
            homestayId: 1, roomTypeId: 1, checkInDate: '2026-09-10', checkOutDate: '2026-09-11',
            guestName: '李四', guestIdCard: '522601199001011234', guestPhone: '13800000001', nights: 1,
          },
        })
      ).rejects.toMatchObject({ code: 3002 });
    });
  });

  describe('createOrder 票务', () => {
    it('预扣分日期库存并生成票务扩展', async () => {
      await seedTicket(1, '2026-09-12', 100);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.TICKET, merchantId: 4, totalAmount: 160,
        ticketOrder: { bizType: 'ticket', bizId: 1, useDate: '2026-09-12', quantity: 2, visitors: '["张三","李四"]' },
      });
      const inv = await repo(TicketInventoryEntity).findOneBy({ ticketTypeId: 1, useDate: '2026-09-12' });
      expect(inv!.sold).toBe(2);
      const to = await repo(TicketOrderEntity).findOneBy({ orderId: order.id });
      expect(to!.quantity).toBe(2);
    });

    it('余票不足抛业务错误', async () => {
      await seedTicket(1, '2026-09-12', 1);
      await expect(
        svc.createOrder({
          userId: 2, orderType: OrderType.TICKET, merchantId: 4, totalAmount: 160,
          ticketOrder: { bizType: 'ticket', bizId: 1, useDate: '2026-09-12', quantity: 2 },
        })
      ).rejects.toMatchObject({ code: 3001, message: '该日期票务库存不足' });
    });
  });

  describe('onPaid 支付回调', () => {
    it('商品订单：状态置已支付 + 销量库存联动 + 默认抽佣 5% + 消息', async () => {
      const { product, sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      const after = await repo(OrderEntity).findOneBy({ id: order.id });
      expect(after!.status).toBe(OrderStatus.PAID);
      expect(after!.payTime).not.toBeNull();
      const p = await repo(ProductEntity).findOneBy({ id: product.id });
      expect(p!.sales).toBe(1);
      expect(p!.stock).toBe(9);
      const fin = await repo(FinanceRecordEntity).findOneBy({ orderId: order.id });
      expect(Number(fin!.commissionRate)).toBe(0.05);
      expect(Number(fin!.commission)).toBe(5);
      expect(Number(fin!.merchantIncome)).toBe(95);
      const msgs = await repo(MessageEntity).findBy({ userId: 2 });
      expect(msgs).toHaveLength(1);
      expect(msgs[0].title).toBe('订单支付成功');
    });

    it('幂等：已支付订单重复回调不再记账', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await svc.onPaid(order.id);
      expect(await repo(FinanceRecordEntity).count()).toBe(1);
      expect(await repo(MessageEntity).count()).toBe(1);
    });

    it('抽佣比例读取配置 commission_goods=0.08', async () => {
      const { sku } = await seedSku(10);
      await repo(SystemConfigEntity).save(repo(SystemConfigEntity).create({ configKey: 'commission_goods', configValue: '0.08' }));
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      const fin = await repo(FinanceRecordEntity).findOneBy({ orderId: order.id });
      expect(Number(fin!.commissionRate)).toBe(0.08);
      expect(Number(fin!.commission)).toBe(8);
    });

    it('服务类订单默认抽佣 10%', async () => {
      const slot = await seedSlot(20);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.MEAL, merchantId: 2, totalAmount: 60,
        mealBooking: { restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10', guestCount: 2, contactName: '张三', contactPhone: '13800000001' },
      });
      await svc.onPaid(order.id);
      const fin = await repo(FinanceRecordEntity).findOneBy({ orderId: order.id });
      expect(Number(fin!.commissionRate)).toBe(0.1);
      expect(Number(fin!.commission)).toBe(6);
      expect(Number(fin!.merchantIncome)).toBe(54);
    });

    it('门票支付生成逐张电子票，游客名按名单解析', async () => {
      await seedTicket(1, '2026-09-12', 100);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.TICKET, merchantId: 4, totalAmount: 160,
        ticketOrder: { bizType: 'ticket', bizId: 1, useDate: '2026-09-12', quantity: 2, visitors: '["张三","李四"]' },
      });
      await svc.onPaid(order.id);
      const tickets = await repo(EticketEntity).find({ where: { orderId: order.id }, order: { id: 'ASC' } });
      expect(tickets).toHaveLength(2);
      expect(tickets[0].visitorName).toBe('张三');
      expect(tickets[1].visitorName).toBe('李四');
      expect(tickets.every(t => t.status === 0)).toBe(true);
      expect(tickets.every(t => t.code.startsWith('ET'))).toBe(true);
    });

    it('路线支付增加销量', async () => {
      const route = await repo(RouteEntity).save(
        repo(RouteEntity).create({ merchantId: 4, title: '苗寨两日游', days: 2, price: 500, dest: '雷公山', sales: 0, status: 1 })
      );
      // 路线订单不占用票务库存，直接构造主表与票务扩展后支付
      const order = await repo(OrderEntity).save(
        repo(OrderEntity).create({
          orderNo: svc.genOrderNo(), userId: 2, merchantId: 4,
          orderType: OrderType.ROUTE, status: OrderStatus.PENDING_PAY, totalAmount: 1000, payAmount: 1000,
        })
      );
      await repo(TicketOrderEntity).save(
        repo(TicketOrderEntity).create({ orderId: order.id, bizType: 'route', bizId: route.id, useDate: '2026-09-12', quantity: 2 })
      );
      await svc.onPaid(order.id);
      const after = await repo(RouteEntity).findOneBy({ id: route.id });
      expect(after!.sales).toBe(2);
    });
  });

  describe('cancelOrder 取消与库存回补', () => {
    it('待支付订单取消并回补 SKU 库存', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 2 }],
      });
      await svc.cancelOrder(2, order.id, '不想要了');
      const after = await repo(OrderEntity).findOneBy({ id: order.id });
      expect(after!.status).toBe(OrderStatus.CANCELLED);
      expect(after!.cancelReason).toBe('不想要了');
      const skuAfter = await repo(ProductSkuEntity).findOneBy({ id: sku.id });
      expect(skuAfter!.stock).toBe(10);
    });

    it('已支付订单取消提示走退款', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await expect(svc.cancelOrder(2, order.id)).rejects.toMatchObject({ code: 3003 });
    });

    it('已完成订单不可取消', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await repo(OrderEntity).update(order.id, { status: OrderStatus.COMPLETED });
      await expect(svc.cancelOrder(2, order.id)).rejects.toMatchObject({ code: 3003 });
    });

    it('取消他人订单抛不存在', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await expect(svc.cancelOrder(999, order.id)).rejects.toMatchObject({ code: 3005 });
    });

    it('取消餐位订单回补余量', async () => {
      const slot = await seedSlot(20);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.MEAL, merchantId: 2, totalAmount: 60,
        mealBooking: { restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10', guestCount: 2, contactName: '张三', contactPhone: '13800000001' },
      });
      await svc.cancelOrder(2, order.id);
      const quota = await repo(MealQuotaEntity).findOneBy({ restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10' });
      expect(quota!.booked).toBe(0);
    });

    it('取消住宿订单回补逐日房态', async () => {
      await seedRooms(1, '2026-09-10', 2, 5);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.HOTEL, merchantId: 3, totalAmount: 600,
        hotelBooking: {
          homestayId: 1, roomTypeId: 1, checkInDate: '2026-09-10', checkOutDate: '2026-09-12',
          guestName: '李四', guestIdCard: '522601199001011234', guestPhone: '13800000001', nights: 2,
        },
      });
      await svc.cancelOrder(2, order.id);
      const invs = await repo(RoomInventoryEntity).find({ where: { roomTypeId: 1 }, order: { invDate: 'ASC' } });
      expect(invs.map(i => i.booked)).toEqual([0, 0]);
    });

    it('取消门票订单回补余票', async () => {
      await seedTicket(1, '2026-09-12', 100);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.TICKET, merchantId: 4, totalAmount: 160,
        ticketOrder: { bizType: 'ticket', bizId: 1, useDate: '2026-09-12', quantity: 2 },
      });
      await svc.cancelOrder(2, order.id);
      const inv = await repo(TicketInventoryEntity).findOneBy({ ticketTypeId: 1, useDate: '2026-09-12' });
      expect(inv!.sold).toBe(0);
    });
  });

  describe('applyRefund / handleRefund 退款链路', () => {
    async function makePaidOrder() {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 2 }],
      });
      await svc.onPaid(order.id);
      return order;
    }

    it('已支付订单申请退款：生成退款单并置退款中', async () => {
      const order = await makePaidOrder();
      const { refundNo } = await svc.applyRefund(2, order.id, '行程有变');
      expect(refundNo).toMatch(/^RF/);
      const after = await repo(OrderEntity).findOneBy({ id: order.id });
      expect(after!.status).toBe(OrderStatus.REFUNDING);
      const refund = await repo(RefundRecordEntity).findOneBy({ orderId: order.id });
      expect(refund!.status).toBe(0);
      expect(Number(refund!.amount)).toBe(100);
    });

    it('重复申请退款被拒绝：订单已处退款中状态', async () => {
      const order = await makePaidOrder();
      await svc.applyRefund(2, order.id, '第一次');
      await expect(svc.applyRefund(2, order.id, '第二次')).rejects.toMatchObject({ code: 3003 });
    });

    it('退款通过：订单置已退款 + 库存回补 + 电子票作废 + 消息', async () => {
      await seedTicket(1, '2026-09-12', 100);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.TICKET, merchantId: 4, totalAmount: 160,
        ticketOrder: { bizType: 'ticket', bizId: 1, useDate: '2026-09-12', quantity: 2 },
      });
      await svc.onPaid(order.id);
      await svc.applyRefund(2, order.id, '不去了');
      const refund = await repo(RefundRecordEntity).findOneBy({ orderId: order.id });
      await svc.handleRefund(refund!.id, true, '同意');
      const after = await repo(OrderEntity).findOneBy({ id: order.id });
      expect(after!.status).toBe(OrderStatus.REFUNDED);
      const inv = await repo(TicketInventoryEntity).findOneBy({ ticketTypeId: 1, useDate: '2026-09-12' });
      expect(inv!.sold).toBe(0);
      const tickets = await repo(EticketEntity).findBy({ orderId: order.id });
      expect(tickets.every(t => t.status === 2)).toBe(true);
      const refundAfter = await repo(RefundRecordEntity).findOneBy({ id: refund!.id });
      expect(refundAfter!.status).toBe(1);
    });

    it('退款驳回：订单回到已支付', async () => {
      const order = await makePaidOrder();
      await svc.applyRefund(2, order.id, '行程有变');
      const refund = await repo(RefundRecordEntity).findOneBy({ orderId: order.id });
      await svc.handleRefund(refund!.id, false, '不符合退款条件');
      const after = await repo(OrderEntity).findOneBy({ id: order.id });
      expect(after!.status).toBe(OrderStatus.PAID);
      const refundAfter = await repo(RefundRecordEntity).findOneBy({ id: refund!.id });
      expect(refundAfter!.status).toBe(2);
    });
  });

  describe('商家侧状态流转', () => {
    it('商家确认：已支付 → 已确认', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await svc.merchantConfirm(1, order.id);
      expect((await repo(OrderEntity).findOneBy({ id: order.id }))!.status).toBe(OrderStatus.CONFIRMED);
    });

    it('非已支付状态确认抛 3003', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await expect(svc.merchantConfirm(1, order.id)).rejects.toMatchObject({ code: 3003 });
    });

    it('非本商家订单确认抛不存在', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await expect(svc.merchantConfirm(2, order.id)).rejects.toMatchObject({ code: 3005 });
    });

    it('发货：明细置已发货 + 订单进行中', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await svc.shipGoods(1, order.id, 'SF123456');
      expect((await repo(OrderEntity).findOneBy({ id: order.id }))!.status).toBe(OrderStatus.IN_PROGRESS);
      const item = await repo(OrderItemEntity).findOneBy({ orderId: order.id });
      expect(item!.shippingStatus).toBe(1);
      expect(item!.logisticsNo).toBe('SF123456');
    });

    it('确认收货：商品订单完成', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await svc.shipGoods(1, order.id, 'SF123456');
      await svc.confirmReceive(2, order.id);
      expect((await repo(OrderEntity).findOneBy({ id: order.id }))!.status).toBe(OrderStatus.COMPLETED);
      expect((await repo(OrderItemEntity).findOneBy({ orderId: order.id }))!.shippingStatus).toBe(2);
    });

    it('非商品订单确认收货抛参数错误', async () => {
      const slot = await seedSlot(20);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.MEAL, merchantId: 2, totalAmount: 60,
        mealBooking: { restaurantId: 1, slotId: slot.id, bookingDate: '2026-09-10', guestCount: 2, contactName: '张三', contactPhone: '13800000001' },
      });
      await expect(svc.confirmReceive(2, order.id)).rejects.toMatchObject({ code: 2001 });
    });

    it('商家完成：进行中 → 已完成', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await svc.onPaid(order.id);
      await svc.shipGoods(1, order.id, 'SF123456');
      await svc.merchantComplete(1, order.id);
      expect((await repo(OrderEntity).findOneBy({ id: order.id }))!.status).toBe(OrderStatus.COMPLETED);
    });
  });

  describe('closeTimeoutOrders 超时关闭', () => {
    it('只关闭超时的待支付订单并回补库存', async () => {
      const { sku } = await seedSku(10);
      // 造 2 个超时订单
      for (let i = 0; i < 2; i++) {
        const order = await svc.createOrder({
          userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
          items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
        });
        await repo(OrderEntity).query(
          'UPDATE t_order SET created_at = DATE_SUB(NOW(), INTERVAL 60 MINUTE) WHERE id = ?',
          [order.id]
        );
      }
      // 造 1 个新订单（不超时）
      await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      const closed = await svc.closeTimeoutOrders(30);
      expect(closed).toBe(2);
      const all = await repo(OrderEntity).find();
      const cancelled = all.filter(o => o.status === OrderStatus.CANCELLED);
      expect(cancelled).toHaveLength(2);
      expect(cancelled.every(o => o.cancelReason === '超时未支付，系统自动取消')).toBe(true);
      // 3 个订单共扣 3 件，2 个超时订单各回补 1 件，未超时订单仍占用 1 件
      expect((await repo(ProductSkuEntity).findOneBy({ id: sku.id }))!.stock).toBe(9);
    });
  });

  describe('detail / list 查询', () => {
    it('detail 组装主表与扩展数据', async () => {
      await seedTicket(1, '2026-09-12', 100);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.TICKET, merchantId: 4, totalAmount: 160,
        ticketOrder: { bizType: 'ticket', bizId: 1, useDate: '2026-09-12', quantity: 2 },
      });
      const detail = await svc.detail(2, order.id);
      expect(detail.orderNo).toBe(order.orderNo);
      expect(detail.ticketOrder.useDate).toBe('2026-09-12');
      expect(detail.items).toEqual([]);
      expect(detail.pay).toBeNull();
    });

    it('查看他人订单抛不存在', async () => {
      const { sku } = await seedSku(10);
      const order = await svc.createOrder({
        userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
        items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
      });
      await expect(svc.detail(3, order.id)).rejects.toMatchObject({ code: 3005 });
    });

    it('list 分页与状态过滤', async () => {
      const { sku } = await seedSku(10);
      for (let i = 0; i < 3; i++) {
        await svc.createOrder({
          userId: 2, orderType: OrderType.GOODS, merchantId: 1, totalAmount: 100,
          items: [{ skuId: sku.id, title: '测试银饰', price: 100, quantity: 1 }],
        });
      }
      const page = await svc.list(2, 'all', undefined, 1, 2);
      expect(page.total).toBe(3);
      expect(page.list).toHaveLength(2);
      const filtered = await svc.list(2, 'all', OrderStatus.PENDING_PAY, 1, 10);
      expect(filtered.total).toBe(3);
      const none = await svc.list(2, 'all', OrderStatus.PAID, 1, 10);
      expect(none.total).toBe(0);
    });
  });
});
