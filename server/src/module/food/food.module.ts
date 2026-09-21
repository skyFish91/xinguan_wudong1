import { Body, Controller, Get, Inject, Param, Post, Provide, Put, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { RestaurantEntity, DishEntity, MealSlotEntity, MealQuotaEntity, FarmCategoryEntity, FarmProductEntity } from '../../entity/food.entity';
import { OrderService } from '../order/order.module';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderType } from '../../common/constants';
import { IsNotEmpty } from 'class-validator';
import dayjs from 'dayjs';

/** 餐位预订 DTO */
export class MealBookingDTO {
  @IsNotEmpty({ message: '餐厅不能为空' })
  restaurantId: number;
  @IsNotEmpty({ message: '时段不能为空' })
  slotId: number;
  @IsNotEmpty({ message: '预订日期不能为空' })
  bookingDate: string;
  @IsNotEmpty({ message: '人数不能为空' })
  guestCount: number;
  @IsNotEmpty({ message: '联系人不能为空' })
  contactName: string;
  @IsNotEmpty({ message: '联系电话不能为空' })
  contactPhone: string;
}

/** 模块二 食：餐饮 + 农产品服务 */
@Provide()
export class FoodService {
  @InjectEntityModel(RestaurantEntity)
  restaurantRepo: Repository<RestaurantEntity>;

  @InjectEntityModel(DishEntity)
  dishRepo: Repository<DishEntity>;

  @InjectEntityModel(MealSlotEntity)
  slotRepo: Repository<MealSlotEntity>;

  @InjectEntityModel(MealQuotaEntity)
  quotaRepo: Repository<MealQuotaEntity>;

  @InjectEntityModel(FarmCategoryEntity)
  farmCategoryRepo: Repository<FarmCategoryEntity>;

  @InjectEntityModel(FarmProductEntity)
  farmRepo: Repository<FarmProductEntity>;

  @Inject()
  orderService: OrderService;

  /** 餐厅列表（评分/容纳人数排序） */
  async restaurantList(sort: string, keyword: string, page: number, pageSize: number) {
    const qb = this.restaurantRepo.createQueryBuilder('r').where('r.status = 1');
    if (keyword) {
      qb.andWhere('(r.name LIKE :kw OR r.address LIKE :kw)', { kw: `%${keyword}%` });
    }
    switch (sort) {
      case 'capacity':
        qb.orderBy('r.capacity', 'DESC');
        break;
      default:
        qb.orderBy('r.rating', 'DESC');
    }
    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 餐厅详情（菜品+时段+当日余量） */
  async restaurantDetail(id: number, date?: string) {
    const restaurant = await this.restaurantRepo.findOneBy({ id, status: 1 });
    if (!restaurant) {
      throw BizError.notFound('餐厅不存在');
    }
    const [dishes, slots] = await Promise.all([
      this.dishRepo.findBy({ restaurantId: id, status: 1 }),
      this.slotRepo.findBy({ restaurantId: id, status: 1 }),
    ]);
    // 当日各时段余量
    const queryDate = date || dayjs().format('YYYY-MM-DD');
    const quotas = await this.quotaRepo.findBy({ restaurantId: id, bookingDate: queryDate });
    const slotWithQuota = slots.map(slot => {
      const quota = quotas.find(q => q.slotId === slot.id);
      return { ...slot, booked: quota?.booked || 0, remain: slot.maxBooking - (quota?.booked || 0) };
    });
    return { ...restaurant, dishes, slots: slotWithQuota };
  }

  /** 餐位预订：提前至少 2 小时 */
  async createMealBooking(userId: number, dto: MealBookingDTO) {
    const restaurant = await this.restaurantRepo.findOneBy({ id: dto.restaurantId, status: 1 });
    if (!restaurant) {
      throw BizError.notFound('餐厅不存在');
    }
    const slot = await this.slotRepo.findOneBy({ id: dto.slotId, restaurantId: dto.restaurantId, status: 1 });
    if (!slot) {
      throw BizError.notFound('时段不存在');
    }
    // 预订日期不能早于今天，且提前 2 小时（从时段名中提取开始时间，如"午餐 11:30-13:30" → 11:30）
    const timeMatch = slot.slotName.match(/(\d{1,2}:\d{2})/);
    const target = timeMatch ? dayjs(`${dto.bookingDate} ${timeMatch[1]}`, 'YYYY-MM-DD HH:mm') : null;
    if (!target || !target.isValid() || target.isBefore(dayjs().add(2, 'hour'))) {
      throw BizError.biz('餐位预订需提前至少 2 小时');
    }
    // 人数限制
    if (dto.guestCount < 1 || dto.guestCount > 20) {
      throw BizError.param('预订人数须在 1-20 之间');
    }
    const order = await this.orderService.createOrder({
      userId,
      orderType: OrderType.MEAL,
      merchantId: restaurant.merchantId,
      totalAmount: 0, // 餐位预订免费
      remark: `${restaurant.name} 餐位预订`,
      mealBooking: {
        restaurantId: dto.restaurantId,
        slotId: dto.slotId,
        bookingDate: dto.bookingDate,
        guestCount: dto.guestCount,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
      },
    });
    return order;
  }

  // ---------- 农产品 ----------
  async farmCategories() {
    return this.farmCategoryRepo.find({ order: { sort: 'ASC' } });
  }

  async farmList(categoryId: number | undefined, keyword: string, sort: string, page: number, pageSize: number) {
    const qb = this.farmRepo.createQueryBuilder('f').where('f.status = 1');
    if (categoryId) {
      qb.andWhere('f.category_id = :cid', { cid: categoryId });
    }
    if (keyword) {
      qb.andWhere('f.name LIKE :kw', { kw: `%${keyword}%` });
    }
    switch (sort) {
      case 'sales':
        qb.orderBy('f.sales', 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('f.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('f.price', 'DESC');
        break;
      default:
        qb.orderBy('f.id', 'DESC');
    }
    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async farmDetail(id: number) {
    const farm = await this.farmRepo.findOneBy({ id, status: 1 });
    if (!farm) {
      throw BizError.notFound('农产品不存在');
    }
    return farm;
  }
}

@ApiTags(['模块二-食-餐饮美食'])
@Controller('/api/food')
export class FoodController {
  @Inject()
  foodService: FoodService;

  @ApiOperation({ summary: '餐厅列表（sort: rating/capacity）' })
  @Get('/restaurants')
  async restaurants(
    @Query('sort') sort: string,
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.foodService.restaurantList(sort, keyword, Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '餐厅详情（菜品/时段/当日余量）' })
  @Get('/restaurants/:id')
  async restaurantDetail(@Param('id') id: number, @Query('date') date: string) {
    return this.foodService.restaurantDetail(Number(id), date);
  }

  @ApiOperation({ summary: '餐位预订（创建预订订单，免费）' })
  @Auth()
  @Post('/bookings')
  async booking(@Body() dto: MealBookingDTO, @CurrentUserParam() user: CurrentUser) {
    return this.foodService.createMealBooking(user.userId, dto);
  }

  @ApiOperation({ summary: '农产品分类' })
  @Get('/farm/categories')
  async farmCategories() {
    return this.foodService.farmCategories();
  }

  @ApiOperation({ summary: '农产品列表' })
  @Get('/farm/products')
  async farmProducts(
    @Query('categoryId') categoryId: number | undefined,
    @Query('keyword') keyword: string,
    @Query('sort') sort: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 12
  ) {
    return this.foodService.farmList(categoryId ? Number(categoryId) : undefined, keyword, sort, Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '农产品详情（含产地溯源/保质期）' })
  @Get('/farm/products/:id')
  async farmDetail(@Param('id') id: number) {
    return this.foodService.farmDetail(Number(id));
  }
}
