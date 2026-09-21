import { DataSource } from 'typeorm';
import { UserEntity, UserAddressEntity, MerchantEntity, MerchantApplyEntity, RoleEntity, OperationLogEntity } from '../../src/entity/user.entity';
import { OrderEntity, OrderItemEntity, MealBookingEntity, HotelBookingEntity, TicketOrderEntity, PayRecordEntity, RefundRecordEntity, CartItemEntity } from '../../src/entity/order.entity';
import {
  ProductCategoryEntity, InheritorEntity, ProductEntity, ProductSkuEntity, ProductImageEntity,
} from '../../src/entity/clothing.entity';
import {
  RestaurantEntity, DishEntity, MealSlotEntity, MealQuotaEntity, FarmCategoryEntity, FarmProductEntity,
} from '../../src/entity/food.entity';
import {
  HomestayEntity, RoomTypeEntity, RoomInventoryEntity,
} from '../../src/entity/hotel.entity';
import {
  ScenicEntity, TicketTypeEntity, TicketInventoryEntity, RouteEntity, RouteItineraryEntity, TrafficGuideEntity, EticketEntity,
} from '../../src/entity/travel.entity';
import { PostEntity, CommentEntity, TopicEntity, FollowEntity, ReportEntity } from '../../src/entity/community.entity';
import { ReviewEntity, FavoriteEntity, LikeEntity } from '../../src/entity/interaction.entity';
import {
  BannerEntity, ActivityBannerEntity, AnnouncementEntity, RecommendEntity, HotKeywordEntity, SensitiveWordEntity,
  FinanceRecordEntity, SettlementEntity, SystemConfigEntity, MessageEntity, VisitLogEntity, SearchHistoryEntity,
} from '../../src/entity/platform.entity';
import { OrderService } from '../../src/module/order/order.module';

/** 测试数据源：连接独立的 wudong_test 库 */
export const dataSource = new DataSource({
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'wudong_test',
  synchronize: false,
  logging: false,
  timezone: '+08:00',
  extra: {
    supportBigNumbers: true,
    bigNumberStrings: false,
  },
  entities: [
    UserEntity, UserAddressEntity, MerchantEntity, MerchantApplyEntity, RoleEntity, OperationLogEntity,
    OrderEntity, OrderItemEntity, MealBookingEntity, HotelBookingEntity, TicketOrderEntity, PayRecordEntity, RefundRecordEntity, CartItemEntity,
    ProductCategoryEntity, InheritorEntity, ProductEntity, ProductSkuEntity, ProductImageEntity,
    RestaurantEntity, DishEntity, MealSlotEntity, MealQuotaEntity, FarmCategoryEntity, FarmProductEntity,
    HomestayEntity, RoomTypeEntity, RoomInventoryEntity,
    ScenicEntity, TicketTypeEntity, TicketInventoryEntity, RouteEntity, RouteItineraryEntity, TrafficGuideEntity, EticketEntity,
    PostEntity, CommentEntity, TopicEntity, FollowEntity, ReportEntity,
    ReviewEntity, FavoriteEntity, LikeEntity,
    BannerEntity, ActivityBannerEntity, AnnouncementEntity, RecommendEntity, HotKeywordEntity, SensitiveWordEntity,
    FinanceRecordEntity, SettlementEntity, SystemConfigEntity, MessageEntity, VisitLogEntity, SearchHistoryEntity,
  ],
});

/** 获取实体仓库 */
export function repo<E>(entity: new () => E) {
  return dataSource.getRepository(entity);
}

/** 清空测试库全部表（外键约束关闭状态下 TRUNCATE） */
export async function truncateAll() {
  const tables: Array<{ TABLE_NAME: string }> = await dataSource.query(
    "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = 'wudong_test'"
  );
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    // MySQL 的 TRUNCATE 不支持一次多表；外键检查关闭状态下并行清空
    await Promise.all(tables.map(t => dataSource.query(`TRUNCATE TABLE \`${t.TABLE_NAME}\``)));
  } finally {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

/** 直接实例化服务类（属性注入由测试手动赋值仓库） */
export function makeService<T>(cls: new () => T): T {
  return new cls();
}

/** 组装 OrderService 并注入全部仓库（购物车等依赖订单服务的模块共用） */
export function wireOrderService(): OrderService {
  const svc = makeService(OrderService);
  svc.orderRepo = repo(OrderEntity);
  svc.orderItemRepo = repo(OrderItemEntity);
  svc.mealBookingRepo = repo(MealBookingEntity);
  svc.hotelBookingRepo = repo(HotelBookingEntity);
  svc.ticketOrderRepo = repo(TicketOrderEntity);
  svc.payRepo = repo(PayRecordEntity);
  svc.refundRepo = repo(RefundRecordEntity);
  svc.skuRepo = repo(ProductSkuEntity);
  svc.farmRepo = repo(FarmProductEntity);
  svc.roomInvRepo = repo(RoomInventoryEntity);
  svc.ticketInvRepo = repo(TicketInventoryEntity);
  svc.mealQuotaRepo = repo(MealQuotaEntity);
  svc.eticketRepo = repo(EticketEntity);
  svc.financeRepo = repo(FinanceRecordEntity);
  svc.configRepo = repo(SystemConfigEntity);
  svc.messageRepo = repo(MessageEntity);
  return svc;
}
