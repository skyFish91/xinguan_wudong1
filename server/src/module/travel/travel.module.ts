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
import { OrderService } from '../order/order.module';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderType } from '../../common/constants';
import { IsNotEmpty } from 'class-validator';
import dayjs from 'dayjs';
import { RedisService } from '@midwayjs/redis';

/** 门票购买 DTO */
export class TicketBuyDTO {
  @IsNotEmpty({ message: '票种不能为空' })
  ticketTypeId: number;
  @IsNotEmpty({ message: '使用日期不能为空' })
  useDate: string;
  @IsNotEmpty({ message: '数量不能为空' })
  quantity: number;
  visitors?: string;
}

/** 路线购买 DTO */
export class RouteBuyDTO {
  @IsNotEmpty({ message: '路线不能为空' })
  routeId: number;
  @IsNotEmpty({ message: '出发日期不能为空' })
  useDate: string;
  @IsNotEmpty({ message: '人数不能为空' })
  quantity: number;
  visitors?: string;
}

/** 模块四 行：票务服务 */
@Provide()
export class TravelService {
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

  @Inject()
  orderService: OrderService;

  @Inject()
  redis: RedisService;

  /** 景区列表（含票种） */
  async scenicList() {
    const scenics = await this.scenicRepo.findBy({ status: 1 });
    const result = [];
    for (const scenic of scenics) {
      const tickets = await this.ticketTypeRepo.findBy({ scenicId: scenic.id, status: 1 });
      result.push({ ...scenic, tickets });
    }
    return result;
  }

  /** 票种库存（按日期查询剩余） */
  async ticketStock(ticketTypeId: number, useDate: string) {
    const inv = await this.ticketInvRepo.findOneBy({ ticketTypeId, useDate });
    if (!inv) {
      return { remain: 0, status: 0 };
    }
    return { remain: inv.status === 1 ? inv.total - inv.sold : 0, status: inv.status, total: inv.total, sold: inv.sold };
  }

  /** 购买门票 */
  async buyTicket(userId: number, dto: TicketBuyDTO) {
    const ticketType = await this.ticketTypeRepo.findOneBy({ id: dto.ticketTypeId, status: 1 });
    if (!ticketType) {
      throw BizError.notFound('票种不存在或已停售');
    }
    if (dto.quantity < 1 || dto.quantity > 10) {
      throw BizError.param('购买数量须在 1-10 之间');
    }
    const scenic = await this.scenicRepo.findOneBy({ id: ticketType.scenicId });
    const order = await this.orderService.createOrder({
      userId,
      orderType: OrderType.TICKET,
      merchantId: 4, // 票务商家（t_merchant id=4，行-出行模块）
      totalAmount: Number(ticketType.price) * dto.quantity,
      remark: `${scenic?.name || ''} ${ticketType.name} x${dto.quantity}`,
      ticketOrder: {
        bizType: 'ticket',
        bizId: dto.ticketTypeId,
        useDate: dto.useDate,
        quantity: dto.quantity,
        visitors: dto.visitors || '',
      },
    });
    return order;
  }

  /** 路线列表（天数/主题筛选，Redis 缓存） */
  async routeList(days: number | undefined, theme: string, keyword: string, page: number, pageSize: number) {
    const cacheKey = `travel:routes:${days || 0}:${theme || ''}:${keyword || ''}:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const qb = this.routeRepo.createQueryBuilder('r').where('r.status = 1');
    if (days) {
      qb.andWhere('r.days = :days', { days });
    }
    if (theme) {
      qb.andWhere('r.themes LIKE :theme', { theme: `%${theme}%` });
    }
    if (keyword) {
      qb.andWhere('r.title LIKE :kw', { kw: `%${keyword}%` });
    }
    const [list, total] = await qb
      .orderBy('r.sales', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const data = { list, total, page, pageSize };
    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
    return data;
  }

  /** 路线详情（含逐日行程） */
  async routeDetail(id: number) {
    const route = await this.routeRepo.findOneBy({ id, status: 1 });
    if (!route) {
      throw BizError.notFound('路线不存在');
    }
    const itineraries = await this.itineraryRepo.find({
      where: { routeId: id },
      order: { dayNo: 'ASC' },
    });
    return { ...route, itineraries };
  }

  /** 购买路线（需提前 1 天） */
  async buyRoute(userId: number, dto: RouteBuyDTO) {
    const route = await this.routeRepo.findOneBy({ id: dto.routeId, status: 1 });
    if (!route) {
      throw BizError.notFound('路线不存在或已下架');
    }
    if (dayjs(dto.useDate).isBefore(dayjs().add(1, 'day'), 'day')) {
      throw BizError.biz('路线套餐最少提前 1 天预订');
    }
    if (dto.quantity < 1 || dto.quantity > 20) {
      throw BizError.param('人数须在 1-20 之间');
    }
    const order = await this.orderService.createOrder({
      userId,
      orderType: OrderType.ROUTE,
      merchantId: route.merchantId,
      totalAmount: Number(route.price) * dto.quantity,
      remark: `${route.title} x${dto.quantity}`,
      ticketOrder: {
        bizType: 'route',
        bizId: dto.routeId,
        useDate: dto.useDate,
        quantity: dto.quantity,
        visitors: dto.visitors || '',
      },
    });
    return order;
  }

  /** 交通攻略列表 */
  async guideList(departFrom: string) {
    const where: any = { status: 1 };
    if (departFrom) {
      where.departFrom = departFrom;
    }
    return this.guideRepo.find({ where });
  }

  /** 攻略详情 */
  async guideDetail(id: number) {
    const guide = await this.guideRepo.findOneBy({ id, status: 1 });
    if (!guide) {
      throw BizError.notFound('攻略不存在');
    }
    return guide;
  }

  /** 生成电子票（支付成功后调用） */
  async generateEtickets(orderId: number) {
    const ticketOrderRepo = this.eticketRepo.manager.getRepository('t_ticket_order' as any);
    const ticketOrder = await ticketOrderRepo.findOneBy({ order_id: orderId });
    if (!ticketOrder) {
      return [];
    }
    const tickets = [];
    const visitors = ticketOrder.visitors ? JSON.parse(ticketOrder.visitors || '[]') : [];
    for (let i = 0; i < ticketOrder.quantity; i++) {
      const code = 'ET' + dayjs().format('YYYYMMDDHHmmss') + String(ticketOrder.id).padStart(4, '0') + i;
      const et = await this.eticketRepo.save(
        this.eticketRepo.create({
          orderId,
          ticketOrderId: ticketOrder.id,
          code,
          bizType: ticketOrder.biz_type,
          bizId: ticketOrder.biz_id,
          useDate: ticketOrder.use_date,
          visitorName: visitors[i]?.name || `游客${i + 1}`,
          status: 0,
        })
      );
      tickets.push(et);
    }
    return tickets;
  }

  /** 我的电子票 */
  async myEtickets(userId: number) {
    const tickets = await this.eticketRepo
      .createQueryBuilder('e')
      .innerJoin('t_order', 'o', 'o.id = e.order_id')
      .where('o.user_id = :userId', { userId })
      .orderBy('e.id', 'DESC')
      .getMany();
    return tickets;
  }

  /** 电子票核销（扫码/手输票号） */
  async verifyEticket(merchantId: number, code: string) {
    const ticket = await this.eticketRepo.findOneBy({ code });
    if (!ticket) {
      throw BizError.notFound('电子票号无效');
    }
    if (ticket.status === 1) {
      throw BizError.biz('该电子票已核销');
    }
    if (ticket.status === 2) {
      throw BizError.biz('该电子票已退款');
    }
    if (dayjs(ticket.useDate).format('YYYY-MM-DD') !== dayjs().format('YYYY-MM-DD')) {
      throw BizError.biz('电子票仅限使用日期当日核销');
    }
    ticket.status = 1;
    ticket.verifyAt = new Date();
    ticket.verifyBy = merchantId;
    await this.eticketRepo.save(ticket);
    return { verified: true, code: ticket.code, visitorName: ticket.visitorName };
  }
}

@ApiTags(['模块四-行-线路订票'])
@Controller('/api/travel')
export class TravelController {
  @Inject()
  travelService: TravelService;

  @ApiOperation({ summary: '景区列表（含票种）' })
  @Get('/scenics')
  async scenics() {
    return this.travelService.scenicList();
  }

  @ApiOperation({ summary: '票种按日期库存' })
  @Get('/tickets/stock')
  async ticketStock(@Query('ticketTypeId') ticketTypeId: number, @Query('useDate') useDate: string) {
    return this.travelService.ticketStock(Number(ticketTypeId), useDate);
  }

  @ApiOperation({ summary: '购买门票' })
  @Auth()
  @Post('/tickets/buy')
  async buyTicket(@Body() dto: TicketBuyDTO, @CurrentUserParam() user: CurrentUser) {
    return this.travelService.buyTicket(user.userId, dto);
  }

  @ApiOperation({ summary: '路线套餐列表（days/theme 筛选）' })
  @Get('/routes')
  async routes(
    @Query('days') days: number | undefined,
    @Query('theme') theme: string,
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.travelService.routeList(days ? Number(days) : undefined, theme, keyword, Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '路线详情（逐日行程）' })
  @Get('/routes/:id')
  async routeDetail(@Param('id') id: number) {
    return this.travelService.routeDetail(Number(id));
  }

  @ApiOperation({ summary: '购买路线套餐' })
  @Auth()
  @Post('/routes/buy')
  async buyRoute(@Body() dto: RouteBuyDTO, @CurrentUserParam() user: CurrentUser) {
    return this.travelService.buyRoute(user.userId, dto);
  }

  @ApiOperation({ summary: '交通攻略列表（按出发地）' })
  @Get('/guides')
  async guides(@Query('departFrom') departFrom: string) {
    return this.travelService.guideList(departFrom);
  }

  @ApiOperation({ summary: '交通攻略详情' })
  @Get('/guides/:id')
  async guideDetail(@Param('id') id: number) {
    return this.travelService.guideDetail(Number(id));
  }

  @ApiOperation({ summary: '我的电子票' })
  @Auth()
  @Get('/my-etickets')
  async myEtickets(@CurrentUserParam() user: CurrentUser) {
    return this.travelService.myEtickets(user.userId);
  }
}
