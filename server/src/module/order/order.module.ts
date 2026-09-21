import { Controller, Get, Inject, Param, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import {
  OrderEntity,
  OrderItemEntity,
  MealBookingEntity,
  HotelBookingEntity,
  TicketOrderEntity,
  PayRecordEntity,
  RefundRecordEntity,
} from '../../entity/order.entity';
import { ProductSkuEntity } from '../../entity/clothing.entity';
import { FarmProductEntity } from '../../entity/food.entity';
import { RoomInventoryEntity } from '../../entity/hotel.entity';
import { TicketInventoryEntity } from '../../entity/travel.entity';
import { EticketEntity } from '../../entity/travel.entity';
import { MealQuotaEntity } from '../../entity/food.entity';
import { FinanceRecordEntity, SystemConfigEntity, MessageEntity } from '../../entity/platform.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderStatus, OrderType } from '../../common/constants';
import { PageResult } from '../../common/response';
import dayjs from 'dayjs';

/** 创建订单入参（各业务模块调用） */
export interface CreateOrderParams {
  userId: number;
  orderType: string;
  merchantId?: number;
  totalAmount: number;
  remark?: string;
  // 商品类
  items?: { skuId?: number; farmProductId?: number; title: string; specName?: string; image?: string; price: number; quantity: number }[];
  // 餐位
  mealBooking?: { restaurantId: number; slotId: number; bookingDate: string; guestCount: number; contactName: string; contactPhone: string };
  // 住宿
  hotelBooking?: { homestayId: number; roomTypeId: number; checkInDate: string; checkOutDate: string; guestName: string; guestIdCard: string; guestPhone: string; nights: number };
  // 票务
  ticketOrder?: { bizType: string; bizId: number; useDate: string; quantity: number; visitors?: string };
}

/** 统一订单服务 */
@Provide()
export class OrderService {
  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(OrderItemEntity)
  orderItemRepo: Repository<OrderItemEntity>;

  @InjectEntityModel(MealBookingEntity)
  mealBookingRepo: Repository<MealBookingEntity>;

  @InjectEntityModel(HotelBookingEntity)
  hotelBookingRepo: Repository<HotelBookingEntity>;

  @InjectEntityModel(TicketOrderEntity)
  ticketOrderRepo: Repository<TicketOrderEntity>;

  @InjectEntityModel(PayRecordEntity)
  payRepo: Repository<PayRecordEntity>;

  @InjectEntityModel(RefundRecordEntity)
  refundRepo: Repository<RefundRecordEntity>;

  @InjectEntityModel(ProductSkuEntity)
  skuRepo: Repository<ProductSkuEntity>;

  @InjectEntityModel(FarmProductEntity)
  farmRepo: Repository<FarmProductEntity>;

  @InjectEntityModel(RoomInventoryEntity)
  roomInvRepo: Repository<RoomInventoryEntity>;

  @InjectEntityModel(TicketInventoryEntity)
  ticketInvRepo: Repository<TicketInventoryEntity>;

  @InjectEntityModel(MealQuotaEntity)
  mealQuotaRepo: Repository<MealQuotaEntity>;

  @InjectEntityModel(EticketEntity)
  eticketRepo: Repository<EticketEntity>;

  @InjectEntityModel(FinanceRecordEntity)
  financeRepo: Repository<FinanceRecordEntity>;

  @InjectEntityModel(SystemConfigEntity)
  configRepo: Repository<SystemConfigEntity>;

  @InjectEntityModel(MessageEntity)
  messageRepo: Repository<MessageEntity>;

  genOrderNo(): string {
    return 'WD' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 9000 + 1000);
  }

  /** 创建订单（含库存预扣） */
  async createOrder(params: CreateOrderParams): Promise<OrderEntity> {
    // 商品类：扣 SKU/农产品库存
    if (params.items) {
      for (const item of params.items) {
        if (item.skuId) {
          const result = await this.skuRepo
            .createQueryBuilder()
            .update()
            .set({ stock: () => 'stock - :n' })
            .where('id = :id AND stock >= :n', { id: item.skuId, n: item.quantity })
            .execute();
          if (!result.affected) {
            throw new BizError(3002, `「${item.title}」库存不足`);
          }
        } else if (item.farmProductId) {
          const result = await this.farmRepo
            .createQueryBuilder()
            .update()
            .set({ stock: () => 'stock - :n' })
            .where('id = :id AND stock >= :n', { id: item.farmProductId, n: item.quantity })
            .execute();
          if (!result.affected) {
            throw new BizError(3002, `「${item.title}」库存不足`);
          }
        }
      }
    }

    // 餐位：预扣余量
    if (params.mealBooking) {
      const mb = params.mealBooking;
      const quota = await this.mealQuotaRepo.findOneBy({
        restaurantId: mb.restaurantId,
        slotId: mb.slotId,
        bookingDate: mb.bookingDate,
      });
      const max = await this.mealQuotaRepo.manager
        .getRepository('t_meal_slot' as any)
        .findOneBy?.({ id: mb.slotId });
      // 简化：以 quota 表已订数限制（maxBooking 从 slot 取）
      const slotRow = await this.mealQuotaRepo.manager.query(
        'SELECT max_booking FROM t_meal_slot WHERE id = ?',
        [mb.slotId]
      );
      const maxBooking = slotRow?.[0]?.max_booking ?? 20;
      const booked = quota?.booked || 0;
      if (booked + 1 > maxBooking) {
        throw new BizError(3002, '该时段餐位已满，请选择其他时段');
      }
      if (quota) {
        quota.booked += 1;
        await this.mealQuotaRepo.save(quota);
      } else {
        await this.mealQuotaRepo.save(
          this.mealQuotaRepo.create({ restaurantId: mb.restaurantId, slotId: mb.slotId, bookingDate: mb.bookingDate, booked: 1 })
        );
      }
    }

    // 住宿：房态预扣（逐日）
    if (params.hotelBooking) {
      const hb = params.hotelBooking;
      const dates: string[] = [];
      for (let i = 0; i < hb.nights; i++) {
        dates.push(dayjs(hb.checkInDate).add(i, 'day').format('YYYY-MM-DD'));
      }
      for (const date of dates) {
        const result = await this.roomInvRepo
          .createQueryBuilder()
          .update()
          .set({ booked: () => 'booked + 1' })
          .where('room_type_id = :room AND inv_date = :date AND status = 1 AND booked < total', {
            room: hb.roomTypeId,
            date,
          })
          .execute();
        if (!result.affected) {
          throw new BizError(3002, `${date} 该房型已满房`);
        }
      }
    }

    // 票务：仅门票订单分日期库存预扣（路线订单 ticketOrder.bizType 为 route，不扣票务库存）
    if (params.ticketOrder && params.ticketOrder.bizType === 'ticket') {
      const to = params.ticketOrder;
      const result = await this.ticketInvRepo
        .createQueryBuilder()
        .update()
        .set({ sold: () => 'sold + :n' })
        .where('ticket_type_id = :id AND use_date = :date AND status = 1 AND sold + :n <= total', {
          id: to.bizId,
          date: to.useDate,
          n: to.quantity,
        })
        .execute();
      if (!result.affected) {
        throw BizError.biz('该日期票务库存不足');
      }
    }

    // 创建订单主表
    const order = this.orderRepo.create({
      orderNo: this.genOrderNo(),
      userId: params.userId,
      merchantId: params.merchantId || null,
      orderType: params.orderType,
      status: OrderStatus.PENDING_PAY,
      totalAmount: params.totalAmount,
      payAmount: params.totalAmount,
      remark: params.remark || '',
    });
    await this.orderRepo.save(order);

    // 明细与扩展
    if (params.items) {
      for (const item of params.items) {
        await this.orderItemRepo.save(
          this.orderItemRepo.create({
            orderId: order.id,
            skuId: item.skuId || null,
            farmProductId: item.farmProductId || null,
            title: item.title,
            specName: item.specName || '',
            image: item.image || '',
            price: item.price,
            quantity: item.quantity,
          })
        );
      }
    }
    if (params.mealBooking) {
      await this.mealBookingRepo.save(this.mealBookingRepo.create({ orderId: order.id, ...params.mealBooking }));
    }
    if (params.hotelBooking) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await this.hotelBookingRepo.save(
        this.hotelBookingRepo.create({ orderId: order.id, ...params.hotelBooking, checkinCode: code })
      );
    }
    if (params.ticketOrder) {
      await this.ticketOrderRepo.save(this.ticketOrderRepo.create({ orderId: order.id, ...params.ticketOrder }));
    }
    return order;
  }

  /** 支付成功回调：更新状态 + 财务记账 + 消息 */
  async onPaid(orderId: number): Promise<void> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) {
      return;
    }
    if (order.status === OrderStatus.PAID) {
      return;
    }
    order.status = OrderStatus.PAID;
    order.payTime = new Date();
    await this.orderRepo.save(order);

    // 商品订单增加销量
    if (order.orderType === OrderType.GOODS) {
      const items = await this.orderItemRepo.findBy({ orderId });
      for (const item of items) {
        if (item.skuId) {
          const sku = await this.skuRepo.findOneBy({ id: item.skuId });
          if (sku) {
            const productRepo = this.skuRepo.manager.getRepository('t_product' as any);
            await productRepo
              .createQueryBuilder()
              .update()
              .set({ sales: () => 'sales + :n', stock: () => 'stock - :n' })
              .where('id = :id', { id: sku.productId, n: item.quantity })
              .execute();
          }
        } else if (item.farmProductId) {
          await this.farmRepo
            .createQueryBuilder()
            .update()
            .set({ sales: () => 'sales + :n' })
            .where('id = :id', { id: item.farmProductId, n: item.quantity })
            .execute();
        }
      }
    }
    if (order.orderType === OrderType.TICKET || order.orderType === OrderType.ROUTE) {
      const ticketOrder = await this.ticketOrderRepo.findOneBy({ orderId });
      if (ticketOrder && ticketOrder.bizType === 'route') {
        // 路线销量
        const routeRepo = this.orderRepo.manager.getRepository('t_route' as any);
        await routeRepo
          .createQueryBuilder()
          .update()
          .set({ sales: () => 'sales + :n' })
          .where('id = :id', { id: ticketOrder.bizId, n: ticketOrder.quantity })
          .execute();
      }
      // 生成电子票（按数量逐张生成）
      if (ticketOrder) {
        const visitors = ticketOrder.visitors ? JSON.parse(ticketOrder.visitors || '[]') : [];
        for (let i = 0; i < ticketOrder.quantity; i++) {
          const code = 'ET' + dayjs().format('YYYYMMDDHHmmss') + String(ticketOrder.id).padStart(4, '0') + i;
          await this.eticketRepo.save(
            this.eticketRepo.create({
              orderId,
              ticketOrderId: ticketOrder.id,
              code,
              bizType: ticketOrder.bizType,
              bizId: ticketOrder.bizId,
              useDate: ticketOrder.useDate,
              visitorName: typeof visitors[i] === 'string' ? visitors[i] : `游客${i + 1}`,
              status: 0,
            })
          );
        }
      }
    }

    // 财务记账（抽佣比例：实物 5% / 服务 10%）
    if (order.merchantId) {
      const isGoods = order.orderType === OrderType.GOODS;
      const cfgKey = isGoods ? 'commission_goods' : 'commission_service';
      const cfg = await this.configRepo.findOneBy({ configKey: cfgKey });
      const rate = cfg ? Number(cfg.configValue) : isGoods ? 0.05 : 0.1;
      const commission = Math.round(order.payAmount * rate * 100) / 100;
      await this.financeRepo.save(
        this.financeRepo.create({
          orderId: order.id,
          merchantId: order.merchantId,
          orderAmount: order.payAmount,
          commissionRate: rate,
          commission,
          merchantIncome: Math.round((order.payAmount - commission) * 100) / 100,
        })
      );
    }

    // 站内消息
    await this.messageRepo.save(
      this.messageRepo.create({
        userId: order.userId,
        msgType: 'order',
        title: '订单支付成功',
        content: `订单 ${order.orderNo} 支付成功，金额 ¥${order.payAmount}。`,
      })
    );
  }

  /** 取消订单（未支付/已支付未确认），回补库存 */
  async cancelOrder(userId: number, orderId: number, reason?: string): Promise<boolean> {
    const order = await this.orderRepo.findOneBy({ id: orderId, userId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING_PAY && order.status !== OrderStatus.PAID) {
      throw new BizError(3003, '当前状态不可取消');
    }
    // 已支付订单取消走退款流程提示
    if (order.status === OrderStatus.PAID) {
      throw new BizError(3003, '已支付订单请申请退款');
    }
    order.status = OrderStatus.CANCELLED;
    order.cancelReason = reason || '用户取消';
    await this.orderRepo.save(order);
    await this.releaseStock(order);
    return true;
  }

  /** 回补库存 */
  async releaseStock(order: OrderEntity): Promise<void> {
    const items = await this.orderItemRepo.findBy({ orderId: order.id });
    for (const item of items) {
      if (item.skuId) {
        await this.skuRepo
          .createQueryBuilder()
          .update()
          .set({ stock: () => 'stock + :n' })
          .where('id = :id', { id: item.skuId, n: item.quantity })
          .execute();
      } else if (item.farmProductId) {
        await this.farmRepo
          .createQueryBuilder()
          .update()
          .set({ stock: () => 'stock + :n' })
          .where('id = :id', { id: item.farmProductId, n: item.quantity })
          .execute();
      }
    }
    const meal = await this.mealBookingRepo.findOneBy({ orderId: order.id });
    if (meal) {
      const quota = await this.mealQuotaRepo.findOneBy({
        restaurantId: meal.restaurantId,
        slotId: meal.slotId,
        bookingDate: meal.bookingDate,
      });
      if (quota && quota.booked > 0) {
        quota.booked -= 1;
        await this.mealQuotaRepo.save(quota);
      }
    }
    const hotel = await this.hotelBookingRepo.findOneBy({ orderId: order.id });
    if (hotel) {
      const dates: string[] = [];
      for (let i = 0; i < hotel.nights; i++) {
        dates.push(dayjs(hotel.checkInDate).add(i, 'day').format('YYYY-MM-DD'));
      }
      for (const date of dates) {
        await this.roomInvRepo
          .createQueryBuilder()
          .update()
          .set({ booked: () => 'booked - 1' })
          .where('room_type_id = :room AND inv_date = :date AND booked > 0', { room: hotel.roomTypeId, date })
          .execute();
      }
    }
    const ticket = await this.ticketOrderRepo.findOneBy({ orderId: order.id });
    if (ticket && ticket.bizType === 'ticket') {
      await this.ticketInvRepo
        .createQueryBuilder()
        .update()
        .set({ sold: () => 'sold - :n' })
        .where('ticket_type_id = :id AND use_date = :date AND sold >= :n', {
          id: ticket.bizId,
          date: ticket.useDate,
          n: ticket.quantity,
        })
        .execute();
    }
  }

  /** 申请退款 */
  async applyRefund(userId: number, orderId: number, reason: string) {
    const order = await this.orderRepo.findOneBy({ id: orderId, userId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.CONFIRMED) {
      throw new BizError(3003, '当前状态不可退款');
    }
    const exists = await this.refundRepo.findOneBy({ orderId, status: 0 });
    if (exists) {
      throw BizError.biz('已有退款申请在处理中');
    }
    const refundNo = 'RF' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 900 + 100);
    await this.refundRepo.save(
      this.refundRepo.create({ refundNo, orderId, userId, amount: order.payAmount, reason, status: 0 })
    );
    order.status = OrderStatus.REFUNDING;
    await this.orderRepo.save(order);
    return { refundNo };
  }

  /** 订单列表（按类型 Tab） */
  async list(
    userId: number,
    orderType: string,
    status: number | undefined,
    page: number,
    pageSize: number
  ): Promise<PageResult<any>> {
    const where: any = { userId };
    if (orderType && orderType !== 'all') {
      where.orderType = orderType;
    }
    if (status !== undefined && status >= 0) {
      where.status = status;
    }
    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const list = [];
    for (const order of orders) {
      list.push(await this.detail(userId, order.id));
    }
    return { list, total, page, pageSize };
  }

  /** 订单详情（主表 + 明细/扩展） */
  async detail(userId: number, orderId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order || order.userId !== userId) {
      throw BizError.notFound('订单不存在');
    }
    const items = await this.orderItemRepo.findBy({ orderId });
    const meal = await this.mealBookingRepo.findOneBy({ orderId });
    const hotel = await this.hotelBookingRepo.findOneBy({ orderId });
    const ticket = await this.ticketOrderRepo.findOneBy({ orderId });
    const pay = await this.payRepo.findOneBy({ orderId, status: 1 });
    const refund = await this.refundRepo.findOneBy({ orderId });
    return { ...order, items, mealBooking: meal, hotelBooking: hotel, ticketOrder: ticket, pay, refund };
  }

  /** 商家确认订单 */
  async merchantConfirm(merchantId: number, orderId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId, merchantId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    if (order.status !== OrderStatus.PAID) {
      throw new BizError(3003, '当前状态不可确认');
    }
    order.status = OrderStatus.CONFIRMED;
    await this.orderRepo.save(order);
    await this.messageRepo.save(
      this.messageRepo.create({
        userId: order.userId,
        msgType: 'order',
        title: '订单已确认',
        content: `订单 ${order.orderNo} 商家已确认。`,
      })
    );
    return true;
  }

  /** 商家完成（进行中 → 已完成） */
  async merchantComplete(merchantId: number, orderId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId, merchantId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    if (order.status !== OrderStatus.IN_PROGRESS && order.status !== OrderStatus.CONFIRMED) {
      throw new BizError(3003, '当前状态不可完成');
    }
    order.status = OrderStatus.COMPLETED;
    await this.orderRepo.save(order);
    await this.messageRepo.save(
      this.messageRepo.create({
        userId: order.userId,
        msgType: 'order',
        title: '订单已完成',
        content: `订单 ${order.orderNo} 已完成，感谢您的使用！`,
      })
    );
    return true;
  }

  /** 商品发货 */
  async shipGoods(merchantId: number, orderId: number, logisticsNo: string) {
    const order = await this.orderRepo.findOneBy({ id: orderId, merchantId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    await this.orderItemRepo.update({ orderId }, { shippingStatus: 1, logisticsNo });
    order.status = OrderStatus.IN_PROGRESS;
    await this.orderRepo.save(order);
    return true;
  }

  /** 确认收货 */
  async confirmReceive(userId: number, orderId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId, userId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    if (order.orderType !== OrderType.GOODS) {
      throw BizError.param('仅商品订单可确认收货');
    }
    await this.orderItemRepo.update({ orderId }, { shippingStatus: 2 });
    order.status = OrderStatus.COMPLETED;
    await this.orderRepo.save(order);
    return true;
  }

  /** 退款审批（管理员/商家） */
  async handleRefund(refundId: number, approve: boolean, note: string) {
    const refund = await this.refundRepo.findOneBy({ id: refundId });
    if (!refund || refund.status !== 0) {
      throw BizError.notFound('退款申请不存在或已处理');
    }
    refund.status = approve ? 1 : 2;
    refund.handleNote = note || '';
    await this.refundRepo.save(refund);

    const order = await this.orderRepo.findOneBy({ id: refund.orderId });
    if (order) {
      if (approve) {
        order.status = OrderStatus.REFUNDED;
        // 退款需回补库存
        await this.releaseStock(order);
        // 电子票置为已退款
        await this.ticketOrderRepo.manager.query(
          "UPDATE t_eticket SET status = 2 WHERE order_id = ?",
          [order.id]
        );
      } else {
        order.status = OrderStatus.PAID;
      }
      await this.orderRepo.save(order);
      await this.messageRepo.save(
        this.messageRepo.create({
          userId: order.userId,
          msgType: 'order',
          title: approve ? '退款成功' : '退款被驳回',
          content: approve
            ? `订单 ${order.orderNo} 退款 ¥${refund.amount} 已原路退回（模拟）。`
            : `订单 ${order.orderNo} 退款申请被驳回：${note || '请联系客服'}`,
        })
      );
    }
    return true;
  }

  /** 超时订单自动关闭（定时任务调用） */
  async closeTimeoutOrders(timeoutMinutes = 30) {
    const deadline = dayjs().subtract(timeoutMinutes, 'minute').toDate();
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = 0 AND o.created_at < :deadline', { deadline })
      .getMany();
    for (const order of orders) {
      order.status = OrderStatus.CANCELLED;
      order.cancelReason = '超时未支付，系统自动取消';
      await this.orderRepo.save(order);
      await this.releaseStock(order);
    }
    return orders.length;
  }
}

@ApiTags(['公共-订单中心'])
@Controller('/api/orders')
export class OrderController {
  @Inject()
  orderService: OrderService;

  @ApiOperation({ summary: '我的订单列表（orderType: all/goods/meal/hotel/ticket/route）' })
  @Auth()
  @Get('/')
  async list(
    @Query('orderType') orderType: string,
    @Query('status') status: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.orderService.list(user.userId, orderType, status === undefined ? undefined : Number(status), Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '订单详情' })
  @Auth()
  @Get('/:id')
  async detail(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.orderService.detail(user.userId, Number(id));
  }

  @ApiOperation({ summary: '取消订单' })
  @Auth()
  @Post('/:id/cancel')
  async cancel(@Param('id') id: number, @Query('reason') reason: string, @CurrentUserParam() user: CurrentUser) {
    return this.orderService.cancelOrder(user.userId, Number(id), reason);
  }

  @ApiOperation({ summary: '申请退款' })
  @Auth()
  @Post('/:id/refund')
  async refund(@Param('id') id: number, @Query('reason') reason: string, @CurrentUserParam() user: CurrentUser) {
    return this.orderService.applyRefund(user.userId, Number(id), reason || '');
  }

  @ApiOperation({ summary: '确认收货（商品订单）' })
  @Auth()
  @Post('/:id/receive')
  async receive(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.orderService.confirmReceive(user.userId, Number(id));
  }
}
