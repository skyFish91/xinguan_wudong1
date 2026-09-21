import { ErrorCode } from './constants';

/** 业务异常：统一抛错，由全局过滤器转成统一响应 */
export class BizError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'BizError';
  }

  static biz(message: string): BizError {
    return new BizError(ErrorCode.BIZ_ERROR, message);
  }

  static notFound(message = '资源不存在'): BizError {
    return new BizError(ErrorCode.NOT_FOUND, message);
  }

  static unauthorized(message = '请先登录'): BizError {
    return new BizError(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = '无权限操作'): BizError {
    return new BizError(ErrorCode.FORBIDDEN, message);
  }

  static param(message = '参数错误'): BizError {
    return new BizError(ErrorCode.PARAM_INVALID, message);
  }
}
