import { Controller, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { OrderEntity, PayRecordEntity } from '../../entity/order.entity';
import { OrderService } from '../order/order.module';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { BizError } from '../../common/BizError';
import { OrderStatus } from '../../common/constants';
import dayjs from 'dayjs';

/** 模拟微信支付服务 */
@Provide()
export class PayService {
  @InjectEntityModel(OrderEntity)
  orderRepo: Repository<OrderEntity>;

  @InjectEntityModel(PayRecordEntity)
  payRepo: Repository<PayRecordEntity>;

  @Inject()
  orderService: OrderService;

  /**
   * 创建支付：生成模拟"微信支付"二维码页数据
   * 前端展示二维码弹窗，用户点击"模拟扫码支付"调用 mockScan
   */
  async createPay(userId: number, orderId: number) {
    const order = await this.orderRepo.findOneBy({ id: orderId, userId });
    if (!order) {
      throw BizError.notFound('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING_PAY) {
      throw BizError.biz('订单无需支付或已支付');
    }
    // 已有待支付记录则复用
    let pay = await this.payRepo.findOneBy({ orderId, status: 0 });
    if (!pay) {
      pay = this.payRepo.create({
        payNo: 'PAY' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 900 + 100),
        orderId,
        userId,
        amount: order.payAmount,
        channel: 'mock_wxpay',
        status: 0,
      });
      await this.payRepo.save(pay);
    }
    return {
      payNo: pay.payNo,
      amount: order.payAmount,
      orderNo: order.orderNo,
      qrcodeContent: `WXPAY://${pay.payNo}?amount=${order.payAmount}`,
      tip: '模拟微信支付：点击下方按钮模拟扫码完成支付',
    };
  }

  /** 模拟扫码支付（支付成功回调） */
  async mockScan(userId: number, payNo: string) {
    const pay = await this.payRepo.findOneBy({ payNo, userId });
    if (!pay) {
      throw BizError.notFound('支付单不存在');
    }
    if (pay.status === 1) {
      throw BizError.biz('该支付单已支付');
    }
    pay.status = 1;
    pay.paidAt = new Date();
    await this.payRepo.save(pay);
    // 触发订单支付成功回调
    await this.orderService.onPaid(pay.orderId);
    return { paid: true, amount: pay.amount };
  }

  /** 支付状态查询 */
  async queryStatus(userId: number, orderId: number) {
    const pay = await this.payRepo.findOneBy({ orderId, status: 1 });
    return { paid: !!pay, payNo: pay?.payNo || '', paidAt: pay?.paidAt || null };
  }
}

@ApiTags(['公共-支付'])
@Controller('/api/pay')
export class PayController {
  @Inject()
  payService: PayService;

  @ApiOperation({ summary: '创建支付（返回模拟二维码内容）' })
  @Auth()
  @Post('/create')
  async create(@Query('orderId') orderId: number, @CurrentUserParam() user: CurrentUser) {
    return this.payService.createPay(user.userId, Number(orderId));
  }

  @ApiOperation({ summary: '模拟扫码支付（支付成功回调）' })
  @Auth()
  @Post('/mock-scan')
  async mockScan(@Query('payNo') payNo: string, @CurrentUserParam() user: CurrentUser) {
    return this.payService.mockScan(user.userId, payNo);
  }

  @ApiOperation({ summary: '查询订单支付状态' })
  @Auth()
  @Get('/status')
  async status(@Query('orderId') orderId: number, @CurrentUserParam() user: CurrentUser) {
    return this.payService.queryStatus(user.userId, Number(orderId));
  }
}
