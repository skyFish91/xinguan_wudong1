import { Controller, Get, Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import {
  AnnouncementEntity,
  BannerEntity,
  ActivityBannerEntity,
  RecommendEntity,
} from '../../entity/platform.entity';
import { ProductEntity } from '../../entity/clothing.entity';
import { HomestayEntity } from '../../entity/hotel.entity';
import { RouteEntity } from '../../entity/travel.entity';
import { PostEntity } from '../../entity/community.entity';
import { RedisService } from '@midwayjs/redis';
import { In } from 'typeorm';

/** 首页服务：Banner/公告/推荐位聚合（Redis 缓存热点数据） */
@Provide()
export class HomeService {
  @InjectEntityModel(BannerEntity)
  bannerRepo: Repository<BannerEntity>;

  @InjectEntityModel(ActivityBannerEntity)
  activityRepo: Repository<ActivityBannerEntity>;

  @InjectEntityModel(AnnouncementEntity)
  announceRepo: Repository<AnnouncementEntity>;

  @InjectEntityModel(RecommendEntity)
  recommendRepo: Repository<RecommendEntity>;

  @InjectEntityModel(ProductEntity)
  productRepo: Repository<ProductEntity>;

  @InjectEntityModel(HomestayEntity)
  homestayRepo: Repository<HomestayEntity>;

  @InjectEntityModel(RouteEntity)
  routeRepo: Repository<RouteEntity>;

  @InjectEntityModel(PostEntity)
  postRepo: Repository<PostEntity>;

  @Inject()
  redis: RedisService;

  /** 首页聚合数据 */
  async homeData() {
    // 先读 Redis 缓存
    const cached = await this.redis.get('home:data');
    if (cached) {
      return JSON.parse(cached);
    }

    const [banners, activities, announcements, recommends] = await Promise.all([
      this.bannerRepo.find({ where: { status: 1 }, order: { sort: 'ASC' } }),
      this.activityRepo.find({ where: { status: 1 }, order: { id: 'DESC' } }),
      this.announceRepo.find({ where: { status: 1 }, order: { id: 'DESC' }, take: 5 }),
      this.recommendRepo.find({ where: { status: 1 }, order: { sort: 'ASC' } }),
    ]);

    // 推荐位展开
    const productIds = recommends.filter(r => r.bizType === 'product').map(r => r.bizId);
    const homestayIds = recommends.filter(r => r.bizType === 'homestay').map(r => r.bizId);
    const routeIds = recommends.filter(r => r.bizType === 'route').map(r => r.bizId);

    const [hotProducts, hotHomestays, hotRoutes, hotPosts] = await Promise.all([
      productIds.length ? this.productRepo.findBy({ id: In(productIds), status: 1 }) : [],
      homestayIds.length ? this.homestayRepo.findBy({ id: In(homestayIds), status: 1 }) : [],
      routeIds.length ? this.routeRepo.findBy({ id: In(routeIds), status: 1 }) : [],
      this.postRepo.find({
        where: { status: 1, isHot: 1 },
        order: { likeCount: 'DESC' },
        take: 6,
      }),
    ]);

    const data = {
      banners,
      activities,
      announcements,
      hotProducts,
      hotHomestays,
      hotRoutes,
      hotPosts,
    };
    await this.redis.set('home:data', JSON.stringify(data), 'EX', 300);
    return data;
  }

  /** 清除首页缓存（运营配置变更时调用） */
  async clearCache(): Promise<void> {
    await this.redis.del('home:data');
  }
}

@ApiTags(['公共-首页'])
@Controller('/api/home')
export class HomeController {
  @Inject()
  homeService: HomeService;

  @ApiOperation({ summary: '首页聚合数据（Banner/公告/推荐）' })
  @Get('/')
  async home() {
    return this.homeService.homeData();
  }
}
