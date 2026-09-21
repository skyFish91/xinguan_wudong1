import { Body, Controller, Get, Inject, Param, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { HomestayEntity, RoomTypeEntity, RoomInventoryEntity } from '../../entity/hotel.entity';
import { OrderEntity, HotelBookingEntity } from '../../entity/order.entity';
import { OrderService } from '../order/order.module';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderType, OrderStatus } from '../../common/constants';
import dayjs from 'dayjs';

/** 模块三 住：商家后台服务 */
@Provide()
export class HotelAdminService {
  @InjectEntityModel(HomestayEntity)
  homestayRepo: Repository<HomestayEntity>;

  @InjectEntityModel(RoomTypeEntity)
  roomRepo: Repository<RoomTypeEntity>;

  @InjectEntityModel(RoomInventoryEntity)
  roomInvRepo: Repository<RoomInventoryEntity>;

  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(HotelBookingEntity)
  hotelBookingRepo: Repository<HotelBookingEntity>;

  @Inject()
  orderService: OrderService;

  /** 我的民宿列表 */
  async myHomestays(merchantId: number) {
    return this.homestayRepo.findBy({ merchantId });
  }

  async saveHomestay(merchantId: number, dto: any) {
    if (dto.id) {
      const homestay = await this.homestayRepo.findOneBy({ id: dto.id, merchantId });
      if (!homestay) {
        throw BizError.notFound('民宿不存在');
      }
      Object.assign(homestay, dto);
      return this.homestayRepo.save(homestay);
    }
    return this.homestayRepo.save(this.homestayRepo.create({ ...dto, merchantId }));
  }

  async toggleHomestay(merchantId: number, id: number) {
    const homestay = await this.homestayRepo.findOneBy({ id, merchantId });
    if (!homestay) {
      throw BizError.notFound('民宿不存在');
    }
    homestay.status = homestay.status === 1 ? 0 : 1;
    return this.homestayRepo.save(homestay);
  }

  // ---------- 房型 ----------
  async roomList(merchantId: number, homestayId?: number) {
    if (homestayId) {
      await this.homestayRepo.findOneByOrFail({ id: homestayId, merchantId });
      return this.roomRepo.find({ where: { homestayId }, order: { id: 'ASC' } });
    }
    const homestays = await this.homestayRepo.findBy({ merchantId });
    const ids = homestays.map(h => h.id);
    if (!ids.length) {
      return [];
    }
    return this.roomRepo.find({ where: { homestayId: In(ids) }, order: { id: 'ASC' } });
  }

  async saveRoomType(merchantId: number, dto: any) {
    const homestay = dto.homestayId ? await this.homestayRepo.findOneBy({ id: dto.homestayId, merchantId }) : null;
    if (!homestay) {
      throw BizError.biz('民宿不存在');
    }
    if (dto.id) {
      const room = await this.roomRepo.findOneBy({ id: dto.id, homestayId: dto.homestayId });
      if (!room) {
        throw BizError.notFound('房型不存在');
      }
      Object.assign(room, dto);
      return this.roomRepo.save(room);
    }
    const room = await this.roomRepo.save(this.roomRepo.create(dto as Partial<RoomTypeEntity>));
    // 新房型自动生成未来 30 天房态
    await this.ensureInventory(room.id, 30);
    return room;
  }

  async deleteRoomType(merchantId: number, id: number) {
    const room = await this.roomRepo.findOneBy({ id });
    if (!room) {
      throw BizError.notFound('房型不存在');
    }
    await this.homestayRepo.findOneByOrFail({ id: room.homestayId, merchantId });
    await this.roomRepo.delete(id);
    await this.roomInvRepo.delete({ roomTypeId: id });
    return true;
  }

  /** 确保房态日历存在（未来 N 天） */
  async ensureInventory(roomTypeId: number, days: number) {
    const room = await this.roomRepo.findOneBy({ id: roomTypeId });
    if (!room) {
      return;
    }
    for (let i = 0; i < days; i++) {
      const date = dayjs().add(i, 'day').format('YYYY-MM-DD');
      const exists = await this.roomInvRepo.findOneBy({ roomTypeId, invDate: date });
      if (!exists) {
        await this.roomInvRepo.save(
          this.roomInvRepo.create({
            roomTypeId,
            invDate: date,
            price: room.price,
            total: room.stock,
            booked: 0,
            status: 1,
          })
        );
      }
    }
  }

  /** 房态日历（90 天视图，按房型） */
  async calendar(merchantId: number, roomTypeId: number, startDate?: string) {
    const room = await this.roomRepo.findOneBy({ id: roomTypeId });
    if (!room) {
      throw BizError.notFound('房型不存在');
    }
    await this.homestayRepo.findOneByOrFail({ id: room.homestayId, merchantId });
    const start = startDate || dayjs().format('YYYY-MM-DD');
    const end = dayjs(start).add(89, 'day').format('YYYY-MM-DD');
    const list = await this.roomInvRepo.find({
      where: { roomTypeId, invDate: Between(start, end) },
      order: { invDate: 'ASC' },
    });
    return { room, list };
  }

  /** 批量设置房态（date 数组），price 可选动态价 */
  async batchSetInventory(
    merchantId: number,
    roomTypeId: number,
    dates: string[],
    available: boolean,
    price?: number
  ) {
    const room = await this.roomRepo.findOneBy({ id: roomTypeId });
    if (!room) {
      throw BizError.notFound('房型不存在');
    }
    await this.homestayRepo.findOneByOrFail({ id: room.homestayId, merchantId });
    for (const date of dates) {
      const inv = await this.roomInvRepo.findOneBy({ roomTypeId, invDate: date });
      if (inv) {
        inv.status = available ? 1 : 0;
        if (price !== undefined) {
          inv.price = price;
        }
        await this.roomInvRepo.save(inv);
      } else {
        await this.roomInvRepo.save(
          this.roomInvRepo.create({
            roomTypeId,
            invDate: date,
            price: price !== undefined ? price : room.price,
            total: room.stock,
            booked: 0,
            status: available ? 1 : 0,
          })
        );
      }
    }
    return true;
  }

  // ---------- 订单 ----------
  async orderList(merchantId: number, status: number | undefined, page: number, pageSize: number) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :mid AND o.order_type = :type', { mid: merchantId, type: OrderType.HOTEL });
    if (status !== undefined && status >= 0) {
      qb.andWhere('o.status = :status', { status });
    }
    const [orders, total] = await qb
      .orderBy('o.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const list = [];
    for (const order of orders) {
      const booking = await this.hotelBookingRepo.findOneBy({ orderId: order.id });
      list.push({ ...order, booking });
    }
    return { list, total, page, pageSize };
  }

  /** 商家入住核验（凭入住码） */
  async verifyCheckinCode(merchantId: number, code: string) {
    const booking = await this.hotelBookingRepo
      .createQueryBuilder('b')
      .where('b.checkin_code = :code', { code })
      .getOne();
    if (!booking) {
      throw BizError.notFound('入住码无效');
    }
    const order = await this.orderRepo.findOneBy({ id: booking.orderId, merchantId });
    if (!order) {
      throw BizError.forbidden('无权核验该订单');
    }
    if (order.status === OrderStatus.IN_PROGRESS) {
      return { verified: true, message: '已办理入住' };
    }
    order.status = OrderStatus.IN_PROGRESS;
    await this.orderRepo.save(order);
    return { verified: true, message: '核验成功，办理入住', orderNo: order.orderNo, booking };
  }

  // ---------- 统计 ----------
  async stats(merchantId: number) {
    const homestays = await this.homestayRepo.findBy({ merchantId });
    const ids = homestays.map(h => h.id);
    // 入住率：已预订间夜 / 总间夜（未来 30 天）
    let occupancyRate = 0;
    if (ids.length) {
      const rooms = await this.roomRepo.findBy({ homestayId: In(ids) });
      const roomIds = rooms.map(r => r.id);
      if (roomIds.length) {
        const start = dayjs().format('YYYY-MM-DD');
        const end = dayjs().add(29, 'day').format('YYYY-MM-DD');
        const agg = await this.roomInvRepo
          .createQueryBuilder('i')
          .select('COALESCE(SUM(i.booked), 0)', 'booked')
          .addSelect('COALESCE(SUM(i.total), 0)', 'total')
          .where('i.room_type_id IN (:...ids) AND i.inv_date BETWEEN :start AND :end', {
            ids: roomIds,
            start,
            end,
          })
          .getRawOne();
        if (agg?.total > 0) {
          occupancyRate = Math.round((Number(agg.booked) / Number(agg.total)) * 1000) / 10;
        }
      }
    }
    const orderAgg = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.pay_amount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.merchant_id = :mid AND o.status >= 1 AND o.status NOT IN (5,7)', { mid: merchantId })
      .getRawOne();
    return {
      homestayCount: ids.length,
      roomCount: await this.roomRepo.countBy({ homestayId: In(ids) }).catch(() => 0),
      occupancyRate,
      revenue: Number(orderAgg?.revenue || 0),
      orderCount: Number(orderAgg?.orders || 0),
    };
  }
}

@ApiTags(['商家后台-住'])
@Controller('/api/merchant/hotel')
export class HotelAdminController {
  @Inject()
  hotelAdminService: HotelAdminService;

  @ApiOperation({ summary: '我的民宿列表' })
  @Auth('merchant')
  @Get('/homestays')
  async myHomestays(@CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.myHomestays(user.merchantId);
  }

  @ApiOperation({ summary: '保存民宿（id 为空新增）' })
  @Auth('merchant')
  @Post('/homestays/save')
  async saveHomestay(@Body() dto: any, @CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.saveHomestay(user.merchantId, dto);
  }

  @ApiOperation({ summary: '民宿上下架' })
  @Auth('merchant')
  @Post('/homestays/:id/toggle')
  async toggleHomestay(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.toggleHomestay(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '房型列表（可选按民宿过滤）' })
  @Auth('merchant')
  @Get('/rooms')
  async rooms(
    @Query('homestayId') homestayId: number | undefined,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.hotelAdminService.roomList(user.merchantId, homestayId ? Number(homestayId) : undefined);
  }

  @ApiOperation({ summary: '保存房型（id 为空新增并自动生成 30 天房态）' })
  @Auth('merchant')
  @Post('/rooms/save')
  async saveRoom(@Body() dto: any, @CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.saveRoomType(user.merchantId, dto);
  }

  @ApiOperation({ summary: '删除房型' })
  @Auth('merchant')
  @Post('/rooms/:id/delete')
  async deleteRoom(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.deleteRoomType(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '房态日历（90 天视图）' })
  @Auth('merchant')
  @Get('/calendar')
  async calendar(
    @Query('roomTypeId') roomTypeId: number,
    @Query('startDate') startDate: string,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.hotelAdminService.calendar(user.merchantId, Number(roomTypeId), startDate);
  }

  @ApiOperation({ summary: '批量设置房态（可订/不可订 + 动态价）' })
  @Auth('merchant')
  @Post('/calendar/batch-set')
  async batchSet(
    @Body('roomTypeId') roomTypeId: number,
    @Body('dates') dates: string[],
    @Body('available') available: boolean,
    @Body('price') price: number | undefined,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.hotelAdminService.batchSetInventory(user.merchantId, Number(roomTypeId), dates, !!available, price);
  }

  @ApiOperation({ summary: '住宿订单列表' })
  @Auth('merchant')
  @Get('/orders')
  async orders(
    @Query('status') status: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.hotelAdminService.orderList(
      user.merchantId,
      status === undefined ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '入住码核验' })
  @Auth('merchant')
  @Post('/checkin/verify')
  async verify(@Body('code') code: string, @CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.verifyCheckinCode(user.merchantId, code);
  }

  @ApiOperation({ summary: '店铺数据统计（入住率/平均房价）' })
  @Auth('merchant')
  @Get('/stats')
  async stats(@CurrentUserParam() user: CurrentUser) {
    return this.hotelAdminService.stats(user.merchantId);
  }
}
