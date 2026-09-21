import { IMiddleware, Inject, Middleware } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/koa';
import { JwtService } from '@midwayjs/jwt';
import { BizError } from '../common/BizError';
import { CurrentUser } from '../common/decorators';

/**
 * 鉴权中间件：
 * 1. 解析 Authorization Bearer token → ctx.currentUser
 * 2. 若方法标注 @Auth(...)，校验当前用户角色
 */
@Middleware()
export class AuthGuard implements IMiddleware<Context, NextFunction> {
  @Inject()
  jwtService: JwtService;

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      // 解析 token（解析失败不报错，由 @Auth 接口统一拦截）
      const authHeader = ctx.headers['authorization'] || '';
      if (authHeader.startsWith('Bearer ')) {
        try {
          const payload = (await this.jwtService.verify(authHeader.slice(7))) as any;
          ctx.currentUser = {
            userId: Number(payload.userId),
            role: payload.role,
            merchantId: payload.merchantId ? Number(payload.merchantId) : undefined,
            merchantType: payload.merchantType,
          } as CurrentUser;
        } catch (err) {
          ctx.currentUser = null;
        }
      }

      // 校验 @Auth 注解（全局中间件早于路由中间件执行，ctx.handler 此时可能尚未挂载）
      const handler = (ctx as any).handler;
      const roles: string[] | undefined = handler ? Reflect.getMetadata('auth:roles', handler) : undefined;
      if (roles && roles.length > 0) {
        const user = ctx.currentUser as CurrentUser;
        if (!user) {
          throw BizError.unauthorized();
        }
        if (!roles.includes(user.role)) {
          throw BizError.forbidden();
        }
      }

      await next();
    };
  }

  static getName(): string {
    return 'auth';
  }
}
