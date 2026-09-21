import { IMiddleware, Inject, Middleware } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/koa';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { VisitLogEntity } from '../entity/platform.entity';

/**
 * 访问日志中间件：记录 PV/UV 埋点（view 行为）
 * 异步写库，不阻塞响应
 */
@Middleware()
export class VisitLog implements IMiddleware<Context, NextFunction> {
  @InjectEntityModel(VisitLogEntity)
  visitLogRepo: Repository<VisitLogEntity>;

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const start = Date.now();
      try {
        await next();
      } finally {
        // 仅记录页面类请求，忽略静态资源
        if (ctx.path.startsWith('/api/') && !ctx.path.startsWith('/api/upload')) {
          const userId = ctx.currentUser?.userId || 0;
          this.visitLogRepo
            .save({
              userId,
              page: ctx.path,
              module: (ctx.path.split('/')[2] || '').slice(0, 20),
              action: ctx.method === 'GET' ? 'view' : 'click',
            })
            .catch(() => {
              // 埋点失败不影响主流程
            });
          ctx.logger?.debug?.('[visit] %s %s %sms', ctx.method, ctx.path, Date.now() - start);
        }
      }
    };
  }

  static getName(): string {
    return 'visitLog';
  }
}
