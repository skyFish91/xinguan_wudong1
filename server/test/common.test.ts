import { BizError } from '../src/common/BizError';
import { ErrorCode, OrderStatus, OrderType, UserRole, MerchantType } from '../src/common/constants';
import { maskPhone, maskIdCard } from '../src/common/mask';
import { ok, PageDTO } from '../src/common/response';
import { dataSource } from './helpers/db';

describe('common 工具', () => {
  it('测试库连接可用', () => {
    expect(dataSource.isInitialized).toBe(true);
  });

  describe('BizError', () => {
    it('biz 工厂携带业务错误码 3001', () => {
      const e = BizError.biz('库存不足');
      expect(e).toBeInstanceOf(Error);
      expect(e.name).toBe('BizError');
      expect(e.code).toBe(ErrorCode.BIZ_ERROR);
      expect(e.message).toBe('库存不足');
    });

    it('notFound / unauthorized / forbidden / param 工厂', () => {
      expect(BizError.notFound().code).toBe(ErrorCode.NOT_FOUND);
      expect(BizError.notFound().message).toBe('资源不存在');
      expect(BizError.unauthorized().code).toBe(ErrorCode.UNAUTHORIZED);
      expect(BizError.forbidden().code).toBe(ErrorCode.FORBIDDEN);
      expect(BizError.param('xx 不能为空').code).toBe(ErrorCode.PARAM_INVALID);
    });
  });

  describe('mask 脱敏', () => {
    it('手机号 138****0001', () => {
      expect(maskPhone('13800000001')).toBe('138****0001');
    });

    it('身份证 5226**********1234', () => {
      expect(maskIdCard('522601199001011234')).toBe('5226**********1234');
    });

    it('空值/短值原样返回', () => {
      expect(maskPhone('')).toBe('');
      expect(maskPhone('123')).toBe('123');
      expect(maskIdCard('')).toBe('');
    });
  });

  describe('response 统一结构', () => {
    it('ok 包装 code=0', () => {
      expect(ok({ a: 1 })).toEqual({ code: 0, message: 'success', data: { a: 1 } });
    });

    it('PageDTO 默认页码', () => {
      const dto = new PageDTO();
      expect(dto.page).toBe(1);
      expect(dto.pageSize).toBe(10);
    });
  });

  describe('constants 常量', () => {
    it('订单状态机取值', () => {
      expect(OrderStatus.PENDING_PAY).toBe(0);
      expect(OrderStatus.PAID).toBe(1);
      expect(OrderStatus.CONFIRMED).toBe(2);
      expect(OrderStatus.IN_PROGRESS).toBe(3);
      expect(OrderStatus.COMPLETED).toBe(4);
      expect(OrderStatus.CANCELLED).toBe(5);
      expect(OrderStatus.REFUNDING).toBe(6);
      expect(OrderStatus.REFUNDED).toBe(7);
    });

    it('订单类型与角色/模块常量', () => {
      expect(OrderType.GOODS).toBe('goods');
      expect(OrderType.MEAL).toBe('meal');
      expect(OrderType.HOTEL).toBe('hotel');
      expect(OrderType.TICKET).toBe('ticket');
      expect(OrderType.ROUTE).toBe('route');
      expect(UserRole.ADMIN).toBe('admin');
      expect(MerchantType.CLOTHING).toBe('clothing');
    });
  });
});
