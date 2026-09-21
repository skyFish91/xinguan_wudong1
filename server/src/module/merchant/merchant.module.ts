import { Controller, Get, Post, Put, Del, Patch, Inject, Provide, Query, Param, Body } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { OrderEntity } from '../../entity/order.entity';
import { ProductEntity } from '../../entity/clothing.entity';
import { MerchantEntity } from '../../entity/user.entity';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import dayjs from 'dayjs';

/** 商家数据概览服务 */
@Provide()
export class MerchantDashboardService {
  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  async getDashboard(merchantId: number) {
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

    // 今日订单数
    const todayOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :merchantId', { merchantId })
      .andWhere('DATE(o.created_at) = :today', { today })
      .getCount();

    // 今日销售额（已支付订单）
    const todaySalesResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.pay_amount), 0)', 'amount')
      .where('o.merchant_id = :merchantId', { merchantId })
      .andWhere('DATE(o.created_at) = :today', { today })
      .andWhere('o.status >= 1')
      .getRawOne();

    // 待处理订单数（待发货状态）
    const pendingOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :merchantId', { merchantId })
      .andWhere('o.status = 1')
      .getCount();

    // 商品总数
    const totalProducts = await this.productRepo
      .createQueryBuilder('p')
      .where('p.merchant_id = :merchantId', { merchantId })
      .getCount();

    // 本月收入
    const monthRevenueResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.pay_amount), 0)', 'amount')
      .where('o.merchant_id = :merchantId', { merchantId })
      .andWhere('DATE(o.created_at) >= :monthStart', { monthStart })
      .andWhere('o.status >= 1')
      .getRawOne();

    // 最近5笔订单
    const recentOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :merchantId', { merchantId })
      .orderBy('o.id', 'DESC')
      .limit(5)
      .getMany();

    const statusMap = {
      0: '待付款',
      1: '已支付',
      2: '已确认',
      3: '进行中',
      4: '已完成',
      5: '已取消',
      6: '退款中',
      7: '已退款',
    };

    const recentOrdersList = recentOrders.map(order => ({
      orderNo: order.orderNo,
      userName: `用户${order.userId}`,
      productName: '-',
      amount: Number(order.payAmount || order.totalAmount),
      createTime: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm'),
      status: statusMap[order.status] || '未知',
    }));

    return {
      stats: {
        todayOrders,
        todaySales: Number(todaySalesResult.amount || 0),
        pendingOrders,
        totalProducts,
        monthRevenue: Number(monthRevenueResult.amount || 0),
      },
      recentOrders: recentOrdersList,
    };
  }
}

/** 商家商品管理服务 */
@Provide()
export class MerchantProductService {
  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  async getList(merchantId: number, params: { keyword?: string; status?: number; page: number; pageSize: number }) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.merchant_id = :merchantId', { merchantId });

    if (params.keyword) {
      qb.andWhere('(p.title LIKE :keyword OR p.description LIKE :keyword)', {
        keyword: `%${params.keyword}%`,
      });
    }

    if (params.status !== undefined && params.status !== null) {
      qb.andWhere('p.status = :status', { status: params.status });
    }

    const [list, total] = await qb
      .orderBy('p.id', 'DESC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();

    return { list, total };
  }

  async getDetail(merchantId: number, productId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId, merchantId },
    });
    if (!product) {
      const { BizError } = require('../../common/BizError');
      throw BizError.notFound('商品不存在或无权访问');
    }
    return product;
  }

  async create(merchantId: number, data: Partial<ProductEntity>) {
    const product = this.productRepo.create({
      ...data,
      merchantId,
    });
    await this.productRepo.save(product);
    return product;
  }

  async update(merchantId: number, productId: number, data: Partial<ProductEntity>) {
    const product = await this.getDetail(merchantId, productId);
    Object.assign(product, data);
    await this.productRepo.save(product);
    return product;
  }

  async delete(merchantId: number, productId: number) {
    const product = await this.getDetail(merchantId, productId);
    await this.productRepo.remove(product);
    return { success: true };
  }

  async updateStatus(merchantId: number, productId: number, status: number) {
    const product = await this.getDetail(merchantId, productId);
    product.status = status;
    await this.productRepo.save(product);
    return product;
  }
}

/** 商家数据统计服务 */
@Provide()
export class MerchantStatisticsService {
  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  async getStatistics(merchantId: number) {
    // 近7天销售额趋势（每天）
    const salesTrend = await this.orderRepo
      .createQueryBuilder('o')
      .select('DATE(o.created_at)', 'date')
      .addSelect('COALESCE(SUM(o.pay_amount), 0)', 'amount')
      .where('o.merchant_id = :merchantId', { merchantId })
      .andWhere('o.status >= 1')
      .andWhere('DATE(o.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
      .groupBy('DATE(o.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 订单类型分布（商品/餐饮/民宿/门票）
    const orderDistribution = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.order_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('o.merchant_id = :merchantId', { merchantId })
      .groupBy('o.order_type')
      .getRawMany();

    const typeNameMap = {
      'goods': '商品',
      'meal': '餐饮',
      'hotel': '民宿',
      'ticket': '门票',
    };

    // 商品销量Top10
    const topProducts = await this.productRepo
      .createQueryBuilder('p')
      .select('p.title', 'name')
      .addSelect('COALESCE(p.sales, 0)', 'sales')
      .addSelect('COALESCE(p.sales * p.price, 0)', 'revenue')
      .where('p.merchant_id = :merchantId', { merchantId })
      .orderBy('p.sales', 'DESC')
      .limit(10)
      .getRawMany();

    const topProductsList = topProducts.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      sales: Number(item.sales || 0),
      revenue: Number(item.revenue || 0),
    }));

    return {
      salesTrend: salesTrend.map(item => ({
        date: item.date,
        amount: Number(item.amount || 0),
      })),
      orderDistribution: orderDistribution.map(item => ({
        type: item.type || 'goods',
        name: typeNameMap[item.type] || '其他',
        count: Number(item.count || 0),
      })),
      topProducts: topProductsList,
    };
  }
}

/** 商家店铺设置服务 */
@Provide()
export class MerchantSettingsService {
  @InjectEntityModel(MerchantEntity)
  merchantRepo: Repository<MerchantEntity>;

  async getSettings(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) {
      const { BizError } = require('../../common/BizError');
      throw BizError.notFound('商家信息不存在');
    }
    return {
      name: merchant.shopName,
      phone: merchant.contactPhone || '',
      intro: '', // 商家表没有 intro 字段，返回空
      status: merchant.status,
    };
  }

  async updateSettings(merchantId: number, data: { name?: string; phone?: string; intro?: string; status?: number }) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) {
      const { BizError } = require('../../common/BizError');
      throw BizError.notFound('商家信息不存在');
    }
    if (data.name) merchant.shopName = data.name;
    if (data.phone) merchant.contactPhone = data.phone;
    if (data.status !== undefined) merchant.status = data.status;
    await this.merchantRepo.save(merchant);
    return { success: true };
  }
}

/** 商家订单管理服务 */
@Provide()
export class MerchantOrderService {
  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  async getList(merchantId: number, params: { status?: number; type?: string; page: number; pageSize: number }) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.merchant_id = :merchantId', { merchantId });

    if (params.status !== undefined && params.status !== null) {
      qb.andWhere('o.status = :status', { status: params.status });
    }

    if (params.type) {
      qb.andWhere('o.order_type = :type', { type: params.type });
    }

    const [list, total] = await qb
      .orderBy('o.id', 'DESC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();

    return { list, total };
  }
}

@ApiTags(['商家中心'])
@Controller('/api/merchant')
export class MerchantDashboardController {
  @Inject()
  merchantDashboardService: MerchantDashboardService;

  @Inject()
  merchantProductService: MerchantProductService;

  @Inject()
  merchantOrderService: MerchantOrderService;

  @Inject()
  merchantSettingsService: MerchantSettingsService;

  @Inject()
  merchantStatisticsService: MerchantStatisticsService;

  @ApiOperation({ summary: '商家数据概览' })
  @Auth('merchant')
  @Get('/dashboard')
  async getDashboard(@CurrentUserParam() user: CurrentUser) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantDashboardService.getDashboard(user.merchantId);
  }

  @ApiOperation({ summary: '商品列表' })
  @Auth('merchant')
  @Get('/products')
  async getProducts(@CurrentUserParam() user: CurrentUser, @Query() query: any) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    const { keyword, status, page = 1, pageSize = 10 } = query;
    return this.merchantProductService.getList(user.merchantId, {
      keyword,
      status: status !== undefined ? Number(status) : undefined,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @ApiOperation({ summary: '商品详情' })
  @Auth('merchant')
  @Get('/products/:id')
  async getProduct(@CurrentUserParam() user: CurrentUser, @Param('id') id: string) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantProductService.getDetail(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '创建商品' })
  @Auth('merchant')
  @Post('/products')
  async createProduct(@CurrentUserParam() user: CurrentUser, @Body() body: any) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantProductService.create(user.merchantId, body);
  }

  @ApiOperation({ summary: '更新商品' })
  @Auth('merchant')
  @Put('/products/:id')
  async updateProduct(@CurrentUserParam() user: CurrentUser, @Param('id') id: string, @Body() body: any) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantProductService.update(user.merchantId, Number(id), body);
  }

  @ApiOperation({ summary: '删除商品' })
  @Auth('merchant')
  @Del('/products/:id')
  async deleteProduct(@CurrentUserParam() user: CurrentUser, @Param('id') id: string) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantProductService.delete(user.merchantId, Number(id));
  }

  @ApiOperation({ summary: '更新商品状态' })
  @Auth('merchant')
  @Patch('/products/:id/status')
  async updateProductStatus(@CurrentUserParam() user: CurrentUser, @Param('id') id: string, @Body() body: { status: number }) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantProductService.updateStatus(user.merchantId, Number(id), body.status);
  }

  @ApiOperation({ summary: '订单列表' })
  @Auth('merchant')
  @Get('/orders')
  async getOrders(@CurrentUserParam() user: CurrentUser, @Query() query: any) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    const { status, type, page = 1, pageSize = 10 } = query;
    return this.merchantOrderService.getList(user.merchantId, {
      status: status !== undefined ? Number(status) : undefined,
      type,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @ApiOperation({ summary: '店铺设置查询' })
  @Auth('merchant')
  @Get('/settings')
  async getSettings(@CurrentUserParam() user: CurrentUser) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantSettingsService.getSettings(user.merchantId);
  }

  @ApiOperation({ summary: '更新店铺设置' })
  @Auth('merchant')
  @Put('/settings')
  async updateSettings(@CurrentUserParam() user: CurrentUser, @Body() body: any) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantSettingsService.updateSettings(user.merchantId, body);
  }

  @ApiOperation({ summary: '数据统计' })
  @Auth('merchant')
  @Get('/statistics')
  async getStatistics(@CurrentUserParam() user: CurrentUser) {
    if (!user || !user.merchantId) {
      const { BizError } = require('../../common/BizError');
      throw BizError.forbidden('仅商家可访问');
    }
    return this.merchantStatisticsService.getStatistics(user.merchantId);
  }
}
