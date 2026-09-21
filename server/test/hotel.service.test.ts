import { HotelService } from '../src/module/hotel/hotel.module';
import dayjs from 'dayjs';
import { HomestayEntity, RoomTypeEntity, RoomInventoryEntity } from '../src/entity/hotel.entity';
import { OrderEntity, HotelBookingEntity } from '../src/entity/order.entity';
import { repo, makeService, wireOrderService } from './helpers/db';
import { OrderStatus, OrderType } from '../src/common/constants';

/** 组装 HotelService */
function wireHotelService(): HotelService {
  const svc = makeService(HotelService);
  svc.homestayRepo = repo(HomestayEntity);
  svc.roomRepo = repo(RoomTypeEntity);
  svc.roomInvRepo = repo(RoomInventoryEntity);
  svc.orderService = wireOrderService();
  return svc;
}

/** 造民宿 + 房型 + 房态 */
async function seedHomestay(name = '苗寨云舍', overrides: Partial<HomestayEntity> = {}) {
  const homestay = await repo(HomestayEntity).save(
    repo(HomestayEntity).create({
      name, merchantId: 3, address: '乌东村', styleTags: '苗寨,观景', facilityTags: 'wifi,停车', status: 1, ...overrides,
    })
  );
  return homestay;
}

async function seedRoom(homestayId: number, name = '大床房', price = 300) {
  return repo(RoomTypeEntity).save(
    repo(RoomTypeEntity).create({ homestayId, name, price, status: 1 })
  );
}

/** 造连续房态 */
async function seedInventory(roomTypeId: number, checkIn: string, nights: number, total = 5, booked = 0) {
  for (let i = 0; i < nights; i++) {
    const invDate = dayjs(checkIn).add(i, 'day').format('YYYY-MM-DD');
    await repo(RoomInventoryEntity).save(
      repo(RoomInventoryEntity).create({ roomTypeId, invDate, price: 300, total, booked, status: 1 })
    );
  }
}

describe('HotelService 住宿', () => {
  let svc: HotelService;

  beforeEach(() => {
    svc = wireHotelService();
  });

  describe('homestayList 民宿列表', () => {
    it('关键词与风格标签过滤', async () => {
      await seedHomestay('苗寨云舍');
      await seedHomestay('城市酒店', { styleTags: '现代' });
      const page = await svc.homestayList({ style: '苗寨', page: 1, pageSize: 10 });
      expect(page.total).toBe(1);
      expect(page.list[0].name).toBe('苗寨云舍');
      const byKw = await svc.homestayList({ keyword: '酒店', page: 1, pageSize: 10 });
      expect(byKw.total).toBe(1);
    });

    it('附带房型最低价', async () => {
      const homestay = await seedHomestay();
      await seedRoom(homestay.id, '大床房', 300);
      await seedRoom(homestay.id, '标间', 200);
      const page = await svc.homestayList({ page: 1, pageSize: 10 });
      expect(Number(page.list[0].minPrice)).toBe(200);
    });

    it('按最低价区间过滤', async () => {
      const cheap = await seedHomestay('便宜民宿');
      await seedRoom(cheap.id, '标间', 150);
      const expensive = await seedHomestay('贵民宿');
      await seedRoom(expensive.id, '套房', 600);
      const page = await svc.homestayList({ maxPrice: 300, page: 1, pageSize: 10 });
      expect(page.total).toBe(1);
      expect(page.list[0].name).toBe('便宜民宿');
    });
  });

  describe('homestayDetail 民宿详情', () => {
    it('房型 + 30 天房态日历', async () => {
      const homestay = await seedHomestay();
      const room = await seedRoom(homestay.id);
      const today = dayjs().format('YYYY-MM-DD');
      await seedInventory(room.id, today, 2, 5, 5); // 满房 2 天
      const detail = await svc.homestayDetail(homestay.id, today);
      expect(detail.rooms).toHaveLength(1);
      expect(detail.rooms[0].calendar).toHaveLength(2);
      expect(detail.rooms[0].calendar[0].remain).toBe(0);
      expect(detail.rooms[0].calendar[0].available).toBe(false);
    });

    it('民宿不存在抛 3005', async () => {
      await expect(svc.homestayDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('calcPrice 房价计算', () => {
    it('晚数超限抛 2001', async () => {
      await expect(svc.calcPrice(1, '2026-09-10', '2026-09-10')).rejects.toMatchObject({ code: 2001 });
      await expect(svc.calcPrice(1, '2026-09-10', '2026-10-20')).rejects.toMatchObject({ code: 2001 });
    });

    it('部分日期无房态抛 3001', async () => {
      const room = await seedRoom(1);
      await seedInventory(room.id, '2026-09-10', 1);
      await expect(svc.calcPrice(room.id, '2026-09-10', '2026-09-12')).rejects.toMatchObject({ code: 3001 });
    });

    it('满房抛 3001', async () => {
      const room = await seedRoom(1);
      await seedInventory(room.id, '2026-09-10', 1, 1, 1);
      await expect(svc.calcPrice(room.id, '2026-09-10', '2026-09-11')).rejects.toMatchObject({ code: 3001 });
    });

    it('多晚合计', async () => {
      const room = await seedRoom(1);
      await seedInventory(room.id, '2026-09-10', 2);
      const price = await svc.calcPrice(room.id, '2026-09-10', '2026-09-12');
      expect(price.nights).toBe(2);
      expect(price.total).toBe(600);
      expect(price.detail).toHaveLength(2);
    });
  });

  describe('createBooking 创建预订', () => {
    it('民宿不存在抛 3005', async () => {
      await expect(
        svc.createBooking(2, { homestayId: 999, roomTypeId: 1, checkInDate: '2026-09-10', checkOutDate: '2026-09-11', guestName: '张三', guestIdCard: '522601199001011234', guestPhone: '13800000001' })
      ).rejects.toMatchObject({ code: 3005 });
    });

    it('房型不属于该民宿抛 3005', async () => {
      const homestay = await seedHomestay();
      const other = await seedHomestay('别家民宿');
      const room = await seedRoom(other.id);
      await expect(
        svc.createBooking(2, { homestayId: homestay.id, roomTypeId: room.id, checkInDate: '2026-09-10', checkOutDate: '2026-09-11', guestName: '张三', guestIdCard: '522601199001011234', guestPhone: '13800000001' })
      ).rejects.toMatchObject({ code: 3005 });
    });

    it('预订成功：按动态价生成订单并预扣逐日房态', async () => {
      const homestay = await seedHomestay();
      const room = await seedRoom(homestay.id);
      await seedInventory(room.id, '2026-09-10', 2, 5);
      const order = await svc.createBooking(2, {
        homestayId: homestay.id, roomTypeId: room.id, checkInDate: '2026-09-10', checkOutDate: '2026-09-12',
        guestName: '张三', guestIdCard: '522601199001011234', guestPhone: '13800000001',
      });
      expect(order.orderType).toBe(OrderType.HOTEL);
      expect(order.status).toBe(OrderStatus.PENDING_PAY);
      expect(Number(order.payAmount)).toBe(600);
      const invs = await repo(RoomInventoryEntity).find({ where: { roomTypeId: room.id }, order: { invDate: 'ASC' } });
      expect(invs.map(i => i.booked)).toEqual([1, 1]);
      const booking = await repo(HotelBookingEntity).findOneBy({ orderId: order.id });
      expect(booking!.nights).toBe(2);
      expect(booking!.checkinCode).toMatch(/^\d{6}$/);
      expect(await repo(OrderEntity).count()).toBe(1);
    });
  });
});
