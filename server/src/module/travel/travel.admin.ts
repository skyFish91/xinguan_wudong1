import { Body, Controller, Get, Inject, Param, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import {
  ScenicEntity,
  TicketTypeEntity,
  TicketInventoryEntity,
  RouteEntity,
  RouteItineraryEntity,
  EticketEntity,
  TrafficGuideEntity,
} from '../../entity/travel.entity';
import { OrderEntity, TicketOrderEntity } from '../../entity/order.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderType } from '../../common/constants';
import dayjs from 'dayjs';

/** 模块四 行：商家后台服务 */
@Provide()
export class TravelAdminService {
  @InjectEntityModel(ScenicEntity)
  scenicRepo: Repository<ScenicEntity>;

  @InjectEntityModel(TicketTypeEntity)
  ticketTypeRepo: Repository<TicketTypeEntity>;

  @InjectEntityModel(TicketInventoryEntity)
  ticketInvRepo: Repository<TicketInventoryEntity>;

  @InjectEntityModel(RouteEntity)
  routeRepo: Repository<RouteEntity>;

  @InjectEntityModel(RouteItineraryEntity)
  itineraryRepo: Repository<RouteItineraryEntity>;

  @InjectEntityModel(EticketEntity)
  eticketRepo: Repository<EticketEntity>;

  @InjectEntityModel(TrafficGuideEntity)
  guideRepo: Repository<TrafficGuideEntity>;

  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(TicketOrderEntity)
  ticketOrderRepo: Repository<TicketOrderEntity>;

  // ---------- 景区 ----------
  async saveScenic(dto: any) {
    if (dto.id) {
      const scenic = await this.scenicRepo.findOneBy({ id: dto.id });
      if (!scenic) {
        throw BizError.notFound('景区不存在');
      }
      Object.assign(scenic, dto);
      return this.scenicRepo.save(scenic);
    }
    return this.scenicRepo.save(this.scenicRepo.create(dto as Partial<ScenicEntity>));
  }

  async toggleScenic(id: number) {
    const scenic = await this.scenicRepo.findOneBy({ id });
    if (!scenic) {
      throw BizError.notFound('景区不存在');
    }
    scenic.status = scenic.status === 1 ? 0 : 1;
    return this.scenicRepo.save(scenic);
  }

  // ---------- 票种 ----------
  async saveTicketType(dto: any) {
    if (dto.id) {
      const ticket = await this.ticketTypeRepo.findOneBy({ id: dto.id });
      if (!ticket) {
        throw BizError.notFound('票种不存在');
      }
      Object.assign(ticket, dto);
      const saved = await this.ticketTypeRepo.save(ticket);
      await this.ensureTicketInventory(saved.id, 30);
      return saved;
    }
    const ticket = await this.ticketTypeRepo.save(this.ticketTypeRepo.create(dto as Partial<TicketTypeEntity>));
    await this.ensureTicketInventory(ticket.id, 30);
    return ticket;
  }

  async deleteTicketType(id: number) {
    await this.ticketTypeRepo.delete(id);
    await this.ticketInvRepo.delete({ ticketTypeId: id });
    return true;
  }

  /** 确保未来 30 天票务库存存在 */
  async ensureTicketInventory(ticketTypeId: number, days: number) {
    for (let i = 0; i < days; i++) {
      const date = dayjs().add(i, 'day').format('YYYY-MM-DD');
      const exists = await this.ticketInvRepo.findOneBy({ ticketTypeId, useDate: date });
      if (!exists) {
        await this.ticketInvRepo.save(
          this.ticketInvRepo.create({ ticketTypeId, useDate: date, total: 200, sold: 0, status: 1 })
        );
      }
    }
  }

  /** 调整某日期票务库存 */
  async adjustTicketInventory(ticketTypeId: number, useDate: string, total: number, status: number) {
    const inv = await this.ticketInvRepo.findOneBy({ ticketTypeId, useDate });
    if (inv) {
      inv.total = total;
      inv.status = status;
      return this.ticketInvRepo.save(inv);
    }
    return this.ticketInvRepo.save(this.ticketInvRepo.create({ ticketTypeId, useDate, total, sold: 0, status }));
  }

  // ---------- 路线套餐 ----------
  async routeList(merchantId: number) {
    return this.routeRepo.find({ where: { merchantId }, order: { id: 'DESC' } });
  }

  async routeDetail(merchantId: number, id: number) {
    const route = await this.routeRepo.findOneBy({ id, merchantId });
    if (!route) {
      throw BizError.notFound('路线不存在');
    }
    const itineraries = await this.itineraryRepo.find({ where: { routeId: id }, order: { dayNo: 'ASC' } });
    return { ...route, itineraries };
  }

  async saveRoute(merchantId: number, dto: any) {
    let route: RouteEntity;
    if (dto.id) {
      route = await this.routeRepo.findOneBy({ id: dto.id, merchantId });
      if (!route) {
        throw BizError.notFound('路线不存在');
      }
      Object.assign(route, dto);
      await this.routeRepo.save(route);
    } else {
      route = await this.routeRepo.save(this.routeRepo.create({ ...dto, merchantId } as Partial<RouteEntity>));
    }
    // 行程
    if (dto.itineraries && dto.itineraries.length > 0) {
      await this.itineraryRepo.delete({ routeId: route.id });
      for (const it of dto.itineraries) {
        await this.itineraryRepo.save(this.itineraryRepo.create({ ...it, routeId: route.id }));
      }
    }
    return route;
  }

  async toggleRoute(merchantId: number, id: number) {
    const route = await this.routeRepo.findOneBy({ id, merchantId });
    if (!route) {
      throw BizError.notFound('路线不存在');
    }
    route.status = route.status === 1 ? 0 : 1;
    return this.routeRepo.save(route);
  }

  // ---------- 交通攻略 ----------
  async saveGuide(dto: any) {
    if (dto.id) {
      const guide = await this.guideRepo.findOneBy({ id: dto.id });
      if (!guide) {
        throw BizError.notFound('攻略不存在');
      }
      Object.assign(guide, dto);
      return this.guideRepo.save(guide);
    }
    return this.guideRepo.save(this.guideRepo.create(dto as Partial<TrafficGuideEntity>));
  }

  async deleteGuide(id: number) {
    await this.guideRepo.delete(id);
    return true;
  }

  // ---------- 电子票核销 ----------
  async verifyEticket(merchantId: number, code: string) {
    const ticket = await this.eticketRepo.findOneBy({ code });
    if (!ticket) {
      throw BizError.notFound('电子票号无效');
    }
    // 校验票归属：通过订单商家校验，防止跨商家核销
    const order = await this.orderRepo.findOneBy({ id: ticket.orderId });
    if (!order || order.merchantId !== merchantId) {
      throw BizError.forbidden('该电子票不属于当前商家');
    }
    if (ticket.status === 1) {
      throw BizError.biz('该电子票已核销');
    }
    if (ticket.status === 2) {
      throw BizError.biz('该电子票已退款');
    }
    if (ticket.useDate !== dayjs().format('YYYY-MM-DD')) {
      throw BizError.biz('电子票仅限使用日期当日核销');
    }
    ticket.status = 1;
    ticket.verifyAt = new Date();
    ticket.verifyBy = merchantId;
    await this.eticketRepo.save(ticket);
    return { verified: true, code: ticket.code, visitorName: ticket.visitorName };
  }

  async eticketList(merchantId: number, status: number | undefined, page: number, pageSize: number) {
    const qb = this.eticketRepo
      .createQueryBuilder('e')
      .innerJoin('t_order', 'o', 'o.id = e.order_id AND o.merchant_id = :mid', { mid: merchantId });
    if (status !== undefined && status >= 0) {
      qb.where('e.status = :status', { status });
    }
    const [list, total] = await qb
      .orderBy('e.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ---------- 订单 ----------
  async orderList(merchantId: number, status: number | undefined, page: number, pageSize: number) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :mid AND o.order_type IN (:...types)', {
        mid: merchantId,
        types: [OrderType.TICKET, OrderType.ROUTE],
      });
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
      const ticketOrder = await this.ticketOrderRepo.findOneBy({ orderId: order.id });
      const etickets = await this.eticketRepo.findBy({ orderId: order.id });
      list.push({ ...order, ticketOrder, etickets });
    }
    return { list, total, page, pageSize };
  }

  // ---------- 统计 ----------
  async stats(merchantId: number) {
    const agg = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.order_type', 'orderType')
      .addSelect('COALESCE(SUM(o.pay_amount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.merchant_id = :mid AND o.status >= 1 AND o.status NOT IN (5,7)', { mid: merchantId })
      .groupBy('o.order_type')
      .getRawMany();
    const topRoutes = await this.routeRepo
      .find({ where: { status: 1 }, order: { sales: 'DESC' }, take: 10 });
    const verified = await this.eticketRepo.countBy({ status: 1 });
    const unverified = await this.eticketRepo.countBy({ status: 0 });
    return { byType: agg, topRoutes, verified, unverified };
  }
}

@ApiTags(['商家后台-行'])
@Controller('/api/merchant/travel')
export class TravelAdminController {
  @Inject()
  travelAdminService: TravelAdminService;

  @ApiOperation({ summary: '保存景区' })
  @Auth('merchant', 'admin')
  @Post('/scenics/save')
  async saveScenic(@Body() dto: any) {
    return this.travelAdminService.saveScenic(dto);
  }

  @ApiOperation({ summary: '景区上下架' })
  @Auth('merchant', 'admin')
  @Post('/scenics/:id/toggle')
  async toggleScenic(@Param('id') id: number) {
    return this.travelAdminService.toggleScenic(Number(id));
  }

  @ApiOperation({ summary: '保存票种（自动生成 30 天库存）' })
  @Auth('merchant', 'admin')
  @Post('/tickets/save')
  async saveTicket(@Body() dto: any) {
    return this.travelAdminService.saveTicketType(dto);
  }

  @ApiOperation({ summary: '删除票种' })
  @Auth('merchant', 'admin')
  @Post('/tickets/:id/delete')
  async deleteTicket(@Param('id') id: number) {
    return this.travelAdminService.deleteTicketType(Number(id));
  }

  @ApiOperation({ summary: '调整分日期票务库存' })
  @Auth('merchant', 'admin')
  @Post('/tickets/inventory')
  async adjustInventory(
    @Body('ticketTypeId') ticketTypeId: number,
    @Body('useDate') useDate: string,
    @Body('total') total: number,
    @Body('status') status: number
  ) {
    return this.travelAdminService.adjustTicketInventory(Number(ticketTypeId), useDate, Number(total), Number(status));
  }

  @ApiOperation({ summary: '我的路线列表（全部，含下架）' })
  @Auth('merchant')
  @Get('/routes')
  async routes(@CurrentUserParam() user: CurrentUser) {
    return this.travelAdminService.routeList(user.merchantId);
  }

  @ApiOperation({ summary: '路线详情（含逐日行程，编辑回显）' })
  @Auth('merchant')
  @Get('/routes/:id')
  async routeDetail(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.travelAdminService.routeDetail(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '保存路线套餐（含逐日行程）' })
  @Auth('merchant')
  @Post('/routes/save')
  async saveRoute(@Body() dto: any, @CurrentUserParam() user: CurrentUser) {
    return this.travelAdminService.saveRoute(user.merchantId, dto);
  }

  @ApiOperation({ summary: '路线上下架' })
  @Auth('merchant')
  @Post('/routes/:id/toggle')
  async toggleRoute(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.travelAdminService.toggleRoute(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '保存交通攻略' })
  @Auth('merchant', 'admin')
  @Post('/guides/save')
  async saveGuide(@Body() dto: any) {
    return this.travelAdminService.saveGuide(dto);
  }

  @ApiOperation({ summary: '删除交通攻略' })
  @Auth('merchant', 'admin')
  @Post('/guides/:id/delete')
  async deleteGuide(@Param('id') id: number) {
    return this.travelAdminService.deleteGuide(Number(id));
  }

  @ApiOperation({ summary: '电子票核销（扫码/手输票号，仅商家）' })
  @Auth('merchant')
  @Post('/etickets/verify')
  async verify(@Body('code') code: string, @CurrentUserParam() user: CurrentUser) {
    return this.travelAdminService.verifyEticket(user.merchantId, code);
  }

  @ApiOperation({ summary: '电子票列表（仅本商家）' })
  @Auth('merchant')
  @Get('/etickets')
  async etickets(
    @Query('status') status: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.travelAdminService.eticketList(
      user.merchantId,
      status === undefined ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '票务订单列表' })
  @Auth('merchant')
  @Get('/orders')
  async orders(
    @Query('status') status: number | undefined,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.travelAdminService.orderList(
      user.merchantId,
      status === undefined ? undefined : Number(status),
      Number(page),
      Number(pageSize)
    );
  }

  @ApiOperation({ summary: '票务数据统计' })
  @Auth('merchant')
  @Get('/stats')
  async stats(@CurrentUserParam() user: CurrentUser) {
    return this.travelAdminService.stats(user.merchantId);
  }
}
