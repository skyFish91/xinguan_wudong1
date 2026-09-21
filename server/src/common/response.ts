/** 统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 成功响应 */
export function ok<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

/** 分页数据结构 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页 DTO 基类 */
export class PageDTO {
  page = 1;
  pageSize = 10;
}
