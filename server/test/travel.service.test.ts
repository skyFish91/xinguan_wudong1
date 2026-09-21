import { TravelService } from '../src/module/travel/travel.module';
import dayjs from 'dayjs';
import {
  ScenicEntity, TicketTypeEntity, TicketInventoryEntity, RouteEntity, RouteItineraryEntity, TrafficGuideEntity, EticketEntity,
} from '../src/entity/travel.entity';
import { OrderEntity, TicketOrderEntity } from '../src/entity/order.entity';
import { repo, makeService, wireOrderService } from './helpers/db';
import { OrderStatus, OrderType } from '../src/common/constants';

/** 内存版 Redis */
class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string) { this.store.set(key, val); }
  async get(key: string) { return this.store.get(key) ?? null; }
  async del(key: string) { this.store.delete(key); }
}

/** 组装 TravelService */
function wireTravelService(): { svc: TravelService; redis: FakeRedis } {
  const svc = makeService(TravelService);
  svc.scenicRepo = repo(ScenicEntity);
  svc.ticketTypeRepo = repo(TicketTypeEntity);
  svc.ticketInvRepo = repo(TicketInventoryEntity);
  svc.routeRepo = repo(RouteEntity);
  svc.itineraryRepo = repo(RouteItineraryEntity);
  svc.eticketRepo = repo(EticketEntity);
  svc.guideRepo = repo(TrafficGuideEntity);
  svc.orderService = wireOrderService();
  const redis = new FakeRedis();
  svc.redis = redis as any;
  return { svc, redis };
}

/** 造景区 + 票种 + 库存 */
async function seedScenicWithTicket(total = 100) {
  const scenic = await repo(ScenicEntity).save(
    repo(ScenicEntity).create({ name: '雷公山', address: '雷山县', status: 1 })
  );
  const ticketType = await repo(TicketTypeEntity).save(
    repo(TicketTypeEntity).create({ scenicId: scenic.id, name: '成人票', price: 80, status: 1 })
  );
  await repo(TicketInventoryEntity).save(
    repo(TicketInventoryEntity).create({ ticketTypeId: ticketType.id, useDate: '2026-09-12', total, sold: 0, status: 1 })
  );
  return { scenic, ticketType };
}

/** 造路线 */
async function seedRoute(days = 2, price = 500) {
  return repo(RouteEntity).save(
    repo(RouteEntity).create({ merchantId: 4, title: '苗寨两日游', days, price, dest: '雷公山', themes: '民俗', sales: 0, status: 1 })
  );
}

describe('TravelService 出行', () => {
  let svc: TravelService;
  let redis: FakeRedis;

  beforeEach(() => {
    ({ svc, redis } = wireTravelService());
  });

  describe('scenicList 景区', () => {
    it('返回在售景区及其票种', async () => {
      const { scenic, ticketType } = await seedScenicWithTicket();
      await repo(ScenicEntity).save(repo(ScenicEntity).create({ name: '已关停景区', address: 'x', status: 0 }));
      const list = await svc.scenicList();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('雷公山');
      expect(list[0].tickets).toHaveLength(1);
      expect(list[0].tickets[0].name).toBe('成人票');
      expect(scenic.id).toBeGreaterThan(0);
      expect(ticketType.price).toBeTruthy();
    });
  });

  describe('ticketStock 库存', () => {
    it('无库存记录返回 remain 0', async () => {
      const stock = await svc.ticketStock(999, '2026-09-12');
      expect(stock.remain).toBe(0);
    });

    it('计算剩余 = total - sold', async () => {
      const { ticketType } = await seedScenicWithTicket(100);
      await repo(TicketInventoryEntity).update({ ticketTypeId: ticketType.id }, { sold: 30 });
      const stock = await svc.ticketStock(ticketType.id, '2026-09-12');
      expect(stock.remain).toBe(70);
      expect(stock.status).toBe(1);
    });
  });

  describe('buyTicket 购票', () => {
    it('票种不存在抛 3005', async () => {
      await expect(
        svc.buyTicket(2, { ticketTypeId: 999, useDate: '2026-09-12', quantity: 1 } as any)
      ).rejects.toMatchObject({ code: 3005 });
    });

    it('数量超限抛 2001', async () => {
      const { ticketType } = await seedScenicWithTicket();
      await expect(
        svc.buyTicket(2, { ticketTypeId: ticketType.id, useDate: '2026-09-12', quantity: 11 } as any)
      ).rejects.toMatchObject({ code: 2001 });
      await expect(
        svc.buyTicket(2, { ticketTypeId: ticketType.id, useDate: '2026-09-12', quantity: 0 } as any)
      ).rejects.toMatchObject({ code: 2001 });
    });

    it('购票成功：按票面价生成待支付订单并预扣库存', async () => {
      const { ticketType } = await seedScenicWithTicket(100);
      const order = await svc.buyTicket(2, { ticketTypeId: ticketType.id, useDate: '2026-09-12', quantity: 2 });
      expect(order.orderType).toBe(OrderType.TICKET);
      expect(order.status).toBe(OrderStatus.PENDING_PAY);
      expect(Number(order.payAmount)).toBe(160);
      const inv = await repo(TicketInventoryEntity).findOneBy({ ticketTypeId: ticketType.id });
      expect(inv!.sold).toBe(2);
    });

    it('余票不足抛 3001', async () => {
      const { ticketType } = await seedScenicWithTicket(1);
      await expect(
        svc.buyTicket(2, { ticketTypeId: ticketType.id, useDate: '2026-09-12', quantity: 2 } as any)
      ).rejects.toMatchObject({ code: 3001 });
    });
  });

  describe('routeList / routeDetail 路线', () => {
    it('按天数与主题筛选并缓存', async () => {
      await seedRoute(2);
      await seedRoute(3);
      const page = await svc.routeList(2, undefined, '', 1, 10);
      expect(page.total).toBe(1);
      expect(page.list[0].days).toBe(2);
      // 第二次命中缓存
      const cached = await svc.routeList(2, undefined, '', 1, 10);
      expect(cached.total).toBe(1);
      expect(redis.store.has('travel:routes:2:::1')).toBe(true);
    });

    it('关键词维度隔离缓存：搜索与不带关键词互不串数据', async () => {
      await seedRoute(2);
      await repo(RouteEntity).save(
        repo(RouteEntity).create({ merchantId: 4, title: '峡谷漂流一日', days: 2, price: 300, dest: '峡谷', themes: '探险', sales: 0, status: 1 })
      );
      // 先带关键词搜索：只命中"苗寨"
      const searched = await svc.routeList(undefined, undefined, '苗寨', 1, 10);
      expect(searched.total).toBe(1);
      expect(searched.list[0].title).toBe('苗寨两日游');
      expect(redis.store.has('travel:routes:0::苗寨:1')).toBe(true);
      // 不带关键词浏览同页：应返回全部，而不是命中带关键词的缓存
      const all = await svc.routeList(undefined, undefined, '', 1, 10);
      expect(all.total).toBe(2);
    });

    it('路线详情带逐日行程', async () => {
      const route = await seedRoute();
      await repo(RouteItineraryEntity).save(
        repo(RouteItineraryEntity).create({ routeId: route.id, dayNo: 1, description: '第一天：苗寨' })
      );
      await repo(RouteItineraryEntity).save(
        repo(RouteItineraryEntity).create({ routeId: route.id, dayNo: 2, description: '第二天：雷公山' })
      );
      const detail = await svc.routeDetail(route.id);
      expect(detail.itineraries).toHaveLength(2);
      expect(detail.itineraries[0].description).toBe('第一天：苗寨');
    });

    it('路线不存在抛 3005', async () => {
      await expect(svc.routeDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('buyRoute 购买路线', () => {
    it('路线不存在抛 3005', async () => {
      await expect(
        svc.buyRoute(2, { routeId: 999, useDate: '2026-09-20', quantity: 1 } as any)
      ).rejects.toMatchObject({ code: 3005 });
    });

    it('未提前一天预订抛 3001', async () => {
      const route = await seedRoute();
      const today = dayjs().format('YYYY-MM-DD');
      await expect(
        svc.buyRoute(2, { routeId: route.id, useDate: today, quantity: 1 } as any)
      ).rejects.toMatchObject({ code: 3001 });
    });

    it('人数超限抛 2001', async () => {
      const route = await seedRoute();
      await expect(
        svc.buyRoute(2, { routeId: route.id, useDate: '2026-09-20', quantity: 21 } as any)
      ).rejects.toMatchObject({ code: 2001 });
    });

    it('购买成功：生成路线订单并保存扩展，不扣票务库存', async () => {
      const route = await seedRoute(2, 500);
      const useDate = dayjs().add(3, 'day').format('YYYY-MM-DD');
      const order = await svc.buyRoute(2, { routeId: route.id, useDate, quantity: 2 });
      expect(order.orderType).toBe(OrderType.ROUTE);
      expect(order.status).toBe(OrderStatus.PENDING_PAY);
      expect(Number(order.payAmount)).toBe(1000);
      const ticketOrder = await repo(TicketOrderEntity).findOneBy({ orderId: order.id });
      expect(ticketOrder!.bizType).toBe('route');
      expect(ticketOrder!.bizId).toBe(route.id);
      expect(ticketOrder!.quantity).toBe(2);
      expect(await repo(OrderEntity).count()).toBe(1);
    });
  });

  describe('guide 交通攻略', () => {
    it('按出发地过滤', async () => {
      await repo(TrafficGuideEntity).save(
        repo(TrafficGuideEntity).create({ title: '凯里出发', departFrom: '凯里', transport: '大巴' })
      );
      await repo(TrafficGuideEntity).save(
        repo(TrafficGuideEntity).create({ title: '贵阳出发', departFrom: '贵阳', transport: '高铁' })
      );
      const list = await svc.guideList('凯里');
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('凯里出发');
    });

    it('攻略不存在抛 3005', async () => {
      await expect(svc.guideDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('myEtickets / verifyEticket 电子票', () => {
    async function seedEticket(overrides: Partial<EticketEntity> = {}) {
      const user = 2;
      const order = await repo(OrderEntity).save(
        repo(OrderEntity).create({
          orderNo: 'WDET', userId: user, orderType: 'ticket', status: OrderStatus.PAID, totalAmount: 80, payAmount: 80,
        })
      );
      const ticketOrder = await repo(TicketOrderEntity).save(
        repo(TicketOrderEntity).create({ orderId: order.id, bizType: 'ticket', bizId: 1, useDate: dayjs().format('YYYY-MM-DD'), quantity: 1 })
      );
      return repo(EticketEntity).save(
        repo(EticketEntity).create({
          orderId: order.id, ticketOrderId: ticketOrder.id, code: 'ETTEST001', bizType: 'ticket', bizId: 1,
          useDate: dayjs().format('YYYY-MM-DD'), visitorName: '张三', status: 0, ...overrides,
        })
      );
    }

    it('按用户查我的电子票', async () => {
      await seedEticket();
      const tickets = await svc.myEtickets(2);
      expect(tickets).toHaveLength(1);
      expect(await svc.myEtickets(3)).toHaveLength(0);
    });

    it('票号无效抛 3005', async () => {
      await expect(svc.verifyEticket(4, 'BAD')).rejects.toMatchObject({ code: 3005 });
    });

    it('当日核销成功', async () => {
      const ticket = await seedEticket();
      const result = await svc.verifyEticket(4, 'ETTEST001');
      expect(result.verified).toBe(true);
      const after = await repo(EticketEntity).findOneBy({ id: ticket.id });
      expect(after!.status).toBe(1);
      expect(after!.verifyBy).toBe(4);
      expect(after!.verifyAt).not.toBeNull();
    });

    it('已核销电子票抛 3001', async () => {
      await seedEticket({ status: 1 });
      await expect(svc.verifyEticket(4, 'ETTEST001')).rejects.toMatchObject({ code: 3001 });
    });

    it('已退款电子票抛 3001', async () => {
      await seedEticket({ status: 2 });
      await expect(svc.verifyEticket(4, 'ETTEST001')).rejects.toMatchObject({ code: 3001 });
    });

    it('非使用日期核销抛 3001', async () => {
      await seedEticket({ useDate: '2026-09-12' });
      await expect(svc.verifyEticket(4, 'ETTEST001')).rejects.toMatchObject({ code: 3001 });
    });
  });
});
