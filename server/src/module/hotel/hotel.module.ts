import { Body, Controller, Get, Inject, Param, Post, Provide, Put, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { HomestayEntity, RoomTypeEntity, RoomInventoryEntity } from '../../entity/hotel.entity';
import { OrderService } from '../order/order.module';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderType } from '../../common/constants';
import { IsNotEmpty } from 'class-validator';
import dayjs from 'dayjs';

/** 住宿预订 DTO */
export class HotelBookingDTO {
  @IsNotEmpty({ message: '民宿不能为空' })
  homestayId: number;
  @IsNotEmpty({ message: '房型不能为空' })
  roomTypeId: number;
  @IsNotEmpty({ message: '入住日期不能为空' })
  checkInDate: string;
  @IsNotEmpty({ message: '离店日期不能为空' })
  checkOutDate: string;
  @IsNotEmpty({ message: '入住人姓名不能为空' })
  guestName: string;
  @IsNotEmpty({ message: '入住人身份证不能为空' })
  guestIdCard: string;
  @IsNotEmpty({ message: '联系电话不能为空' })
  guestPhone: string;
}

/** 模块三 住：住宿预订服务 */
@Provide()
export class HotelService {
  @InjectEntityModel(HomestayEntity)
  homestayRepo: Repository<HomestayEntity>;

  @InjectEntityModel(RoomTypeEntity)
  roomRepo: Repository<RoomTypeEntity>;

  @InjectEntityModel(RoomInventoryEntity)
  roomInvRepo: Repository<RoomInventoryEntity>;

  @Inject()
  orderService: OrderService;

  /** 民宿列表（风格/设施/价格筛选） */
  async homestayList(params: {
    keyword?: string;
    style?: string;
    facility?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    pageSize: number;
  }) {
    const qb = this.homestayRepo.createQueryBuilder('h').where('h.status = 1');
    if (params.keyword) {
      qb.andWhere('(h.name LIKE :kw OR h.address LIKE :kw)', { kw: `%${params.keyword}%` });
    }
    if (params.style) {
      qb.andWhere('h.style_tags LIKE :style', { style: `%${params.style}%` });
    }
    if (params.facility) {
      qb.andWhere('h.facility_tags LIKE :fac', { fac: `%${params.facility}%` });
    }
    switch (params.sort) {
      case 'price_asc':
        qb.orderBy('h.id', 'ASC');
        break;
      case 'rating':
        qb.orderBy('h.rating', 'DESC');
        break;
      default:
        qb.orderBy('h.rating', 'DESC');
    }
    const [list, total] = await qb
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();

    // 每家的最低价（当日房型基础价最低者）
    const result = [];
    for (const h of list) {
      const minRoom = await this.roomRepo
        .createQueryBuilder('r')
        .where('r.homestay_id = :hid AND r.status = 1', { hid: h.id })
        .orderBy('r.price', 'ASC')
        .getOne();
      result.push({ ...h, minPrice: minRoom?.price || null });
    }
    // 价格区间过滤（基于房型价）
    let filtered = result;
    if (params.minPrice !== undefined) {
      filtered = filtered.filter(h => h.minPrice === null || h.minPrice >= params.minPrice);
    }
    if (params.maxPrice !== undefined) {
      filtered = filtered.filter(h => h.minPrice === null || h.minPrice <= params.maxPrice);
    }
    return { list: filtered, total: filtered.length, page: params.page, pageSize: params.pageSize };
  }

  /** 民宿详情（房型 + 30 天房态） */
  async homestayDetail(id: number, startDate?: string) {
    const homestay = await this.homestayRepo.findOneBy({ id, status: 1 });
    if (!homestay) {
      throw BizError.notFound('民宿不存在');
    }
    const rooms = await this.roomRepo.findBy({ homestayId: id, status: 1 });
    const start = startDate || dayjs().format('YYYY-MM-DD');
    const end = dayjs(start).add(29, 'day').format('YYYY-MM-DD');
    const inventories = await this.roomInvRepo.find({
      where: { roomTypeId: In(rooms.map(r => r.id)), invDate: Between(start, end) },
      order: { invDate: 'ASC' },
    });
    // 按房型分组房态
    const roomDetail = rooms.map(room => ({
      ...room,
      calendar: inventories
        .filter(inv => inv.roomTypeId === room.id)
        .map(inv => ({
          date: inv.invDate,
          price: inv.price,
          remain: inv.status === 1 ? inv.total - inv.booked : 0,
          available: inv.status === 1 && inv.total - inv.booked > 0,
        })),
    }));
    return { ...homestay, rooms: roomDetail };
  }

  /** 计算房价（多晚合计，按每晚动态价） */
  async calcPrice(roomTypeId: number, checkInDate: string, checkOutDate: string) {
    const nights = dayjs(checkOutDate).diff(dayjs(checkInDate), 'day');
    if (nights < 1 || nights > 30) {
      throw BizError.param('住宿晚数须在 1-30 之间');
    }
    const dates: string[] = [];
    for (let i = 0; i < nights; i++) {
      dates.push(dayjs(checkInDate).add(i, 'day').format('YYYY-MM-DD'));
    }
    const inventories = await this.roomInvRepo.find({
      where: { roomTypeId, invDate: In(dates) },
    });
    if (inventories.length !== dates.length) {
      throw BizError.biz('部分日期暂无房态数据');
    }
    let total = 0;
    const detail = inventories.map(inv => {
      const remain = inv.status === 1 ? inv.total - inv.booked : 0;
      if (remain <= 0) {
        throw BizError.biz(`${inv.invDate} 该房型已满房`);
      }
      total += Number(inv.price);
      return { date: inv.invDate, price: Number(inv.price) };
    });
    return { nights, total, detail };
  }

  /** 创建住宿预订（预付） */
  async createBooking(userId: number, dto: HotelBookingDTO) {
    const homestay = await this.homestayRepo.findOneBy({ id: dto.homestayId, status: 1 });
    if (!homestay) {
      throw BizError.notFound('民宿不存在');
    }
    const room = await this.roomRepo.findOneBy({ id: dto.roomTypeId, homestayId: dto.homestayId, status: 1 });
    if (!room) {
      throw BizError.notFound('房型不存在');
    }
    const nights = dayjs(dto.checkOutDate).diff(dayjs(dto.checkInDate), 'day');
    if (nights < 1 || nights > 30) {
      throw BizError.param('住宿晚数须在 1-30 之间');
    }
    const { total } = await this.calcPrice(dto.roomTypeId, dto.checkInDate, dto.checkOutDate);
    const order = await this.orderService.createOrder({
      userId,
      orderType: OrderType.HOTEL,
      merchantId: homestay.merchantId,
      totalAmount: total,
      remark: `${homestay.name}·${room.name} ${nights} 晚`,
      hotelBooking: {
        homestayId: dto.homestayId,
        roomTypeId: dto.roomTypeId,
        checkInDate: dto.checkInDate,
        checkOutDate: dto.checkOutDate,
        guestName: dto.guestName,
        guestIdCard: dto.guestIdCard,
        guestPhone: dto.guestPhone,
        nights,
      },
    });
    return order;
  }
}

@ApiTags(['模块三-住-住宿预订'])
@Controller('/api/hotel')
export class HotelController {
  @Inject()
  hotelService: HotelService;

  @ApiOperation({ summary: '民宿列表（风格/设施/价格筛选）' })
  @Get('/homestays')
  async homestays(
    @Query('keyword') keyword: string,
    @Query('style') style: string,
    @Query('facility') facility: string,
    @Query('minPrice') minPrice: string | undefined,
    @Query('maxPrice') maxPrice: string | undefined,
    @Query('sort') sort: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.hotelService.homestayList({
      keyword,
      style,
      facility,
      minPrice: minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined,
      sort,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @ApiOperation({ summary: '民宿详情（房型 + 30 天房态日历）' })
  @Get('/homestays/:id')
  async detail(@Param('id') id: number, @Query('startDate') startDate: string) {
    return this.hotelService.homestayDetail(Number(id), startDate);
  }

  @ApiOperation({ summary: '计算房价（多晚合计）' })
  @Get('/price')
  async price(
    @Query('roomTypeId') roomTypeId: number,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string
  ) {
    return this.hotelService.calcPrice(Number(roomTypeId), checkInDate, checkOutDate);
  }

  @ApiOperation({ summary: '创建住宿预订订单（预付）' })
  @Auth()
  @Post('/bookings')
  async booking(@Body() dto: HotelBookingDTO, @CurrentUserParam() user: CurrentUser) {
    return this.hotelService.createBooking(user.userId, dto);
  }
}
