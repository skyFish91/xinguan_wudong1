import { FoodService } from '../src/module/food/food.module';
import dayjs from 'dayjs';
import {
  RestaurantEntity, DishEntity, MealSlotEntity, MealQuotaEntity, FarmCategoryEntity, FarmProductEntity,
} from '../src/entity/food.entity';
import { OrderEntity, MealBookingEntity } from '../src/entity/order.entity';
import { repo, makeService, wireOrderService } from './helpers/db';
import { OrderStatus, OrderType } from '../src/common/constants';

/** 组装 FoodService */
function wireFoodService(): FoodService {
  const svc = makeService(FoodService);
  svc.restaurantRepo = repo(RestaurantEntity);
  svc.dishRepo = repo(DishEntity);
  svc.slotRepo = repo(MealSlotEntity);
  svc.quotaRepo = repo(MealQuotaEntity);
  svc.farmCategoryRepo = repo(FarmCategoryEntity);
  svc.farmRepo = repo(FarmProductEntity);
  svc.orderService = wireOrderService();
  return svc;
}

/** 造餐厅（rating 用原生 SQL 回填，实体无该列映射时绕过） */
async function seedRestaurant(name = '苗家酸汤鱼', overrides: Record<string, unknown> = {}) {
  const restaurant = await repo(RestaurantEntity).save(
    repo(RestaurantEntity).create({ name, merchantId: 2, address: '乌东村老街', status: 1, ...overrides })
  );
  return restaurant;
}

describe('FoodService 美食', () => {
  let svc: FoodService;

  beforeEach(() => {
    svc = wireFoodService();
  });

  describe('restaurantList 餐厅列表', () => {
    it('关键字过滤', async () => {
      await seedRestaurant('苗家酸汤鱼', { address: '老街1号' });
      await seedRestaurant('银饰餐厅', { address: '新街2号' });
      const page = await svc.restaurantList('', '老街', 1, 10);
      expect(page.total).toBe(1);
      expect(page.list[0].name).toBe('苗家酸汤鱼');
    });
  });

  describe('restaurantDetail 餐厅详情', () => {
    it('组装菜品、时段与当日余量', async () => {
      const restaurant = await seedRestaurant();
      await repo(DishEntity).save(repo(DishEntity).create({ restaurantId: restaurant.id, name: '酸汤鱼', price: 88, status: 1 }));
      const slot = await repo(MealSlotEntity).save(
        repo(MealSlotEntity).create({ restaurantId: restaurant.id, slotName: '午餐 11:30-13:30', maxBooking: 30, status: 1 })
      );
      const today = dayjs().format('YYYY-MM-DD');
      await repo(MealQuotaEntity).save(
        repo(MealQuotaEntity).create({ restaurantId: restaurant.id, slotId: slot.id, bookingDate: today, booked: 8 })
      );
      const detail = await svc.restaurantDetail(restaurant.id, today);
      expect(detail.dishes).toHaveLength(1);
      expect(detail.slots).toHaveLength(1);
      expect(detail.slots[0].booked).toBe(8);
      expect(detail.slots[0].remain).toBe(22);
    });

    it('餐厅不存在抛 3005', async () => {
      await expect(svc.restaurantDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('createMealBooking 餐位预订', () => {
    async function seedSlotWithTime(slotName = '午餐 11:30-13:30') {
      const restaurant = await seedRestaurant();
      const slot = await repo(MealSlotEntity).save(
        repo(MealSlotEntity).create({ restaurantId: restaurant.id, slotName, maxBooking: 30, status: 1 })
      );
      return { restaurant, slot };
    }

    it('餐厅不存在抛 3005', async () => {
      await expect(
        svc.createMealBooking(2, { restaurantId: 999, slotId: 1, bookingDate: '2026-09-20', guestCount: 2, contactName: '张三', contactPhone: '13800000001' })
      ).rejects.toMatchObject({ code: 3005 });
    });

    it('时段不存在抛 3005', async () => {
      const { restaurant } = await seedSlotWithTime();
      await expect(
        svc.createMealBooking(2, { restaurantId: restaurant.id, slotId: 999, bookingDate: '2026-09-20', guestCount: 2, contactName: '张三', contactPhone: '13800000001' })
      ).rejects.toMatchObject({ code: 3005 });
    });

    it('已过时段预订抛 3001', async () => {
      const { restaurant, slot } = await seedSlotWithTime();
      // 用昨天日期保证时段必然已过，不依赖测试运行时刻
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      await expect(
        svc.createMealBooking(2, { restaurantId: restaurant.id, slotId: slot.id, bookingDate: yesterday, guestCount: 2, contactName: '张三', contactPhone: '13800000001' })
      ).rejects.toMatchObject({ code: 3001 });
    });

    it('人数超限抛 2001', async () => {
      const { restaurant, slot } = await seedSlotWithTime();
      await expect(
        svc.createMealBooking(2, { restaurantId: restaurant.id, slotId: slot.id, bookingDate: '2026-09-20', guestCount: 21, contactName: '张三', contactPhone: '13800000001' })
      ).rejects.toMatchObject({ code: 2001 });
    });

    it('预订成功：免费订单 + 余量预扣 + 预订扩展', async () => {
      const { restaurant, slot } = await seedSlotWithTime();
      const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
      const order = await svc.createMealBooking(2, {
        restaurantId: restaurant.id, slotId: slot.id, bookingDate: tomorrow, guestCount: 4, contactName: '张三', contactPhone: '13800000001',
      });
      expect(order.orderType).toBe(OrderType.MEAL);
      expect(order.status).toBe(OrderStatus.PENDING_PAY);
      expect(Number(order.payAmount)).toBe(0);
      const quota = await repo(MealQuotaEntity).findOneBy({ restaurantId: restaurant.id, slotId: slot.id, bookingDate: tomorrow });
      expect(quota!.booked).toBe(1);
      const booking = await repo(MealBookingEntity).findOneBy({ orderId: order.id });
      expect(booking!.guestCount).toBe(4);
      expect(booking!.contactName).toBe('张三');
      expect(await repo(OrderEntity).count()).toBe(1);
    });
  });

  describe('farm 农产品', () => {
    it('分类与商品列表', async () => {
      const cat = await repo(FarmCategoryEntity).save(repo(FarmCategoryEntity).create({ name: '腊味', sort: 1 }));
      await repo(FarmProductEntity).save(
        repo(FarmProductEntity).create({ categoryId: cat.id, merchantId: 2, name: '雷山腊肉', price: 50, stock: 10, status: 1 })
      );
      await repo(FarmProductEntity).save(
        repo(FarmProductEntity).create({ categoryId: cat.id + 99, merchantId: 2, name: '其他特产', price: 30, stock: 10, status: 1 })
      );
      const categories = await svc.farmCategories();
      expect(categories).toHaveLength(1);
      const page = await svc.farmList(cat.id, undefined, '', 1, 10);
      expect(page.total).toBe(1);
      expect(page.list[0].name).toBe('雷山腊肉');
      const detail = await svc.farmDetail(page.list[0].id);
      expect(detail.name).toBe('雷山腊肉');
    });

    it('农产品不存在抛 3005', async () => {
      await expect(svc.farmDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });
});
