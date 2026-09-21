import { App, Configuration, Inject, Logger } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as typeorm from '@midwayjs/typeorm';
import * as redis from '@midwayjs/redis';
import * as jwt from '@midwayjs/jwt';
import * as swagger from '@midwayjs/swagger';
import * as validate from '@midwayjs/validate';
import * as upload from '@midwayjs/upload';
import * as info from '@midwayjs/info';
import * as staticFile from '@midwayjs/static-file';
import { join } from 'path';
import { AllExceptionFilter } from './filter/all.exception';
import { AuthGuard } from './middleware/auth.guard';
import { VisitLog } from './middleware/visit.log';

// 实体注册
import * as userEntities from './entity/user.entity';
import * as orderEntities from './entity/order.entity';
import * as interactionEntities from './entity/interaction.entity';
import * as clothingEntities from './entity/clothing.entity';
import * as foodEntities from './entity/food.entity';
import * as hotelEntities from './entity/hotel.entity';
import * as travelEntities from './entity/travel.entity';
import * as communityEntities from './entity/community.entity';
import * as platformEntities from './entity/platform.entity';

const entities = [
  ...Object.values(userEntities),
  ...Object.values(orderEntities),
  ...Object.values(interactionEntities),
  ...Object.values(clothingEntities),
  ...Object.values(foodEntities),
  ...Object.values(hotelEntities),
  ...Object.values(travelEntities),
  ...Object.values(communityEntities),
  ...Object.values(platformEntities),
].filter(x => typeof x === 'function');

@Configuration({
  imports: [
    koa,
    typeorm,
    redis,
    jwt,
    swagger,
    validate,
    upload,
    info,
    staticFile,
  ],
  importConfigs: [join(__dirname, './config')],
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  @Logger()
  logger: any;

  @Inject()
  dataSourceManager: typeorm.TypeORMDataSourceManager;

  async onReady() {
    // 应用过滤器与中间件
    this.app.useFilter([AllExceptionFilter]);
    this.app.useMiddleware([VisitLog, AuthGuard]);

    // 定时任务：每 5 分钟关闭超时未支付订单（回补库存）
    setInterval(async () => {
      try {
        const orderService: any = await this.app
          .getApplicationContext()
          .getAsync(require('./module/order/order.module').OrderService);
        const closed = await orderService.closeTimeoutOrders(30);
        if (closed > 0) {
          this.logger.info('[schedule] 超时关单 %d 笔', closed);
        }
      } catch (err) {
        this.logger.error('[schedule] 超时关单任务异常', err);
      }
    }, 5 * 60 * 1000);

    this.logger.info('[wudong] 乌东文旅平台后端启动完成');
  }
}

export { entities };
