import { createRequestParamDecorator } from '@midwayjs/core';
import { BizError } from './BizError';

/** JWT 载荷中的当前用户信息 */
export interface CurrentUser {
  userId: number;
  role: string;
  merchantId?: number;
  merchantType?: string;
}

/** @Auth 装饰器元数据：ctx.__authRoles 为允许的角色列表，ctx.__authMerchantType 为商家模块限制 */
export function Auth(...roles: string[]): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata('auth:roles', roles, target, propertyKey);
  };
}

/** 从上下文取当前用户（配合 AuthGuard 中间件设置 ctx.currentUser） */
export function CurrentUserParam(): ParameterDecorator {
  return createRequestParamDecorator((ctx: any) => {
    return ctx.currentUser as CurrentUser;
  });
}

/** 获取当前用户，若未登录抛 401 */
export function mustUser(ctx: any): CurrentUser {
  const user = ctx.currentUser as CurrentUser;
  if (!user) {
    throw BizError.unauthorized();
  }
  return user;
}

/** 获取当前商家 ID，非商家抛 403 */
export function mustMerchantId(ctx: any): number {
  const user = mustUser(ctx);
  if (user.role !== 'merchant' || !user.merchantId) {
    throw BizError.forbidden('仅商家可操作');
  }
  return user.merchantId;
}
