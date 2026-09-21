/** 错误码分段：1xxx 认证 / 2xxx 参数 / 3xxx 业务 / 5xxx 系统 */
export const ErrorCode = {
  OK: 0,
  // 认证类
  UNAUTHORIZED: 1001,
  TOKEN_EXPIRED: 1002,
  LOGIN_FAILED: 1003,
  FORBIDDEN: 1004,
  // 参数类
  PARAM_INVALID: 2001,
  // 业务类
  BIZ_ERROR: 3001,
  STOCK_NOT_ENOUGH: 3002,
  ORDER_STATUS_ERROR: 3003,
  CONTENT_SENSITIVE: 3004,
  NOT_FOUND: 3005,
  // 系统类
  SYSTEM_ERROR: 5001,
} as const;

/** 订单状态 */
export const OrderStatus = {
  PENDING_PAY: 0, // 待支付
  PAID: 1, // 已支付/待确认
  CONFIRMED: 2, // 已确认
  IN_PROGRESS: 3, // 进行中
  COMPLETED: 4, // 已完成
  CANCELLED: 5, // 已取消
  REFUNDING: 6, // 退款中
  REFUNDED: 7, // 已退款
} as const;

/** 订单类型 */
export const OrderType = {
  GOODS: 'goods', // 商品（衣/食特产）
  MEAL: 'meal', // 餐位预订
  HOTEL: 'hotel', // 住宿预订
  TICKET: 'ticket', // 门票
  ROUTE: 'route', // 路线套餐
} as const;

/** 用户角色 */
export const UserRole = {
  USER: 'user',
  MERCHANT: 'merchant',
  ADMIN: 'admin',
} as const;

/** 商家模块类型 */
export const MerchantType = {
  CLOTHING: 'clothing',
  FOOD: 'food',
  HOTEL: 'hotel',
  TRAVEL: 'travel',
} as const;

/** 消息类型 */
export const MsgType = {
  SYSTEM: 'system',
  ORDER: 'order',
  INTERACT: 'interact',
} as const;
