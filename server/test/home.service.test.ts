import { HomeService } from '../src/module/home/home.module';
import {
  BannerEntity, ActivityBannerEntity, AnnouncementEntity, RecommendEntity,
} from '../src/entity/platform.entity';
import { ProductEntity } from '../src/entity/clothing.entity';
import { HomestayEntity } from '../src/entity/hotel.entity';
import { RouteEntity } from '../src/entity/travel.entity';
import { PostEntity } from '../src/entity/community.entity';
import { repo, makeService } from './helpers/db';

/** 内存版 Redis */
class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string) { this.store.set(key, val); }
  async get(key: string) { return this.store.get(key) ?? null; }
  async del(key: string) { this.store.delete(key); }
}

/** 组装 HomeService */
function wireHomeService(): { svc: HomeService; redis: FakeRedis } {
  const svc = makeService(HomeService);
  svc.bannerRepo = repo(BannerEntity);
  svc.activityRepo = repo(ActivityBannerEntity);
  svc.announceRepo = repo(AnnouncementEntity);
  svc.recommendRepo = repo(RecommendEntity);
  svc.productRepo = repo(ProductEntity);
  svc.homestayRepo = repo(HomestayEntity);
  svc.routeRepo = repo(RouteEntity);
  svc.postRepo = repo(PostEntity);
  const redis = new FakeRedis();
  svc.redis = redis as any;
  return { svc, redis };
}

/** 造轮播图 */
async function seedBanner() {
  return repo(BannerEntity).save(
    repo(BannerEntity).create({ title: '首页轮播', imageUrl: '/banner.png', sort: 1, status: 1 })
  );
}

/** 造活动横幅 */
async function seedActivity() {
  return repo(ActivityBannerEntity).save(
    repo(ActivityBannerEntity).create({
      title: '苗年节', imageUrl: '/act.png', startTime: new Date('2026-09-01'), endTime: new Date('2026-09-30'), status: 1,
    })
  );
}

/** 造公告 */
async function seedAnnouncement() {
  return repo(AnnouncementEntity).save(
    repo(AnnouncementEntity).create({ title: '系统公告', content: '公告内容', status: 1 })
  );
}

/** 造推荐位配置 */
async function seedRecommend(slotName: string, bizType: string, bizId: number) {
  return repo(RecommendEntity).save(
    repo(RecommendEntity).create({ slotName, bizType, bizId, sort: 1, status: 1 })
  );
}

/** 造热门帖子 */
async function seedHotPost() {
  return repo(PostEntity).save(
    repo(PostEntity).create({ userId: 2, title: '游记分享', content: '苗寨风景', status: 1, isHot: 1, likeCount: 10 })
  );
}

describe('HomeService 首页聚合', () => {
  let svc: HomeService;
  let redis: FakeRedis;

  beforeEach(() => {
    ({ svc, redis } = wireHomeService());
  });

  it('聚合轮播/活动/公告与推荐位展开', async () => {
    await seedBanner();
    await seedActivity();
    await seedAnnouncement();
    const product = await repo(ProductEntity).save(
      repo(ProductEntity).create({ title: '苗族银饰', categoryId: 1, merchantId: 1, mainImage: 'x.png', price: 100, stock: 10, status: 1 })
    );
    const homestay = await repo(HomestayEntity).save(
      repo(HomestayEntity).create({ name: '苗寨云舍', merchantId: 3, address: '乌东村', styleTags: '苗寨', facilityTags: 'wifi', status: 1 })
    );
    const route = await repo(RouteEntity).save(
      repo(RouteEntity).create({ merchantId: 4, title: '苗寨两日游', days: 2, price: 500, dest: '雷公山', themes: '民俗', sales: 0, status: 1 })
    );
    await seedRecommend('hot_products', 'product', product.id);
    await seedRecommend('hot_homestays', 'homestay', homestay.id);
    await seedRecommend('hot_routes', 'route', route.id);
    await seedHotPost();
    // 下架的推荐商品不应展开
    await repo(ProductEntity).save(
      repo(ProductEntity).create({ title: '已下架商品', categoryId: 1, merchantId: 1, mainImage: 'x.png', price: 1, stock: 1, status: 0 })
    );
    await seedRecommend('hot_products', 'product', (await repo(ProductEntity).findOneBy({ title: '已下架商品' }))!.id);

    const data = await svc.homeData();
    expect(data.banners).toHaveLength(1);
    expect(data.banners[0].title).toBe('首页轮播');
    expect(data.activities).toHaveLength(1);
    expect(data.activities[0].title).toBe('苗年节');
    expect(data.announcements).toHaveLength(1);
    expect(data.hotProducts).toHaveLength(1);
    expect(data.hotProducts[0].title).toBe('苗族银饰');
    expect(data.hotHomestays).toHaveLength(1);
    expect(data.hotHomestays[0].name).toBe('苗寨云舍');
    expect(data.hotRoutes).toHaveLength(1);
    expect(data.hotRoutes[0].title).toBe('苗寨两日游');
    expect(data.hotPosts).toHaveLength(1);
    expect(data.hotPosts[0].title).toBe('游记分享');
    // 写入缓存
    expect(redis.store.has('home:data')).toBe(true);
  });

  it('热门帖子只取 isHot 且按点赞降序', async () => {
    await seedHotPost();
    await repo(PostEntity).save(
      repo(PostEntity).create({ userId: 3, title: '普通帖子', content: 'x', status: 1, isHot: 0, likeCount: 999 })
    );
    const data = await svc.homeData();
    expect(data.hotPosts).toHaveLength(1);
    expect(data.hotPosts[0].title).toBe('游记分享');
  });

  it('第二次读命中缓存', async () => {
    await seedBanner();
    const first = await svc.homeData();
    expect(redis.store.has('home:data')).toBe(true);
    const second = await svc.homeData();
    expect(second.banners).toHaveLength(1);
    expect(second.banners[0].title).toBe(first.banners[0].title);
  });

  it('清除缓存后重新聚合', async () => {
    await seedBanner();
    await svc.homeData();
    await svc.clearCache();
    expect(redis.store.has('home:data')).toBe(false);
    const data = await svc.homeData();
    expect(data.banners).toHaveLength(1);
  });
});
