import { Catch, Config } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ErrorCode } from '../common/constants';
import { BizError } from '../common/BizError';

/** 全局异常过滤器：任何异常统一转 { code, message, data } 结构 */
@Catch()
export class AllExceptionFilter {
  @Config('environment')
  env: string;

  async catch(err: Error, ctx: Context) {
    let code: number = ErrorCode.SYSTEM_ERROR;
    let message = '系统繁忙，请稍后再试';

    if (err instanceof BizError) {
      code = err.code;
      message = err.message;
    } else if (err.name === 'ValidationError' || err.name === 'BadRequestError') {
      code = ErrorCode.PARAM_INVALID;
      message = (err as any).message || '参数错误';
    } else if (err.name === 'NotFoundError') {
      code = ErrorCode.NOT_FOUND;
      message = '接口不存在';
    } else {
      ctx.logger.error('[uncaught] %s %s', ctx.method, ctx.path, err);
      if (this.env === 'local' || this.env === 'unittest') {
        message = err.message || message;
      }
    }

    if (code === ErrorCode.UNAUTHORIZED) {
      ctx.status = 401;
    } else if (code === ErrorCode.FORBIDDEN) {
      ctx.status = 403;
    } else if (code === ErrorCode.NOT_FOUND) {
      ctx.status = 404;
    } else {
      ctx.status = 200;
    }
    ctx.body = { code, message, data: null };
  }
}
