import { ClothingService } from '../src/module/clothing/clothing.service';
import {
  ProductCategoryEntity, InheritorEntity, ProductEntity, ProductSkuEntity, ProductImageEntity,
} from '../src/entity/clothing.entity';
import { ReviewEntity, FavoriteEntity } from '../src/entity/interaction.entity';
import { repo, makeService } from './helpers/db';

/** 内存版 Redis */
class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string) { this.store.set(key, val); }
  async get(key: string) { return this.store.get(key) ?? null; }
  async del(key: string) { this.store.delete(key); }
}

/** 组装 ClothingService */
function wireClothingService(): { svc: ClothingService; redis: FakeRedis } {
  const svc = makeService(ClothingService);
  svc.categoryRepo = repo(ProductCategoryEntity);
  svc.productRepo = repo(ProductEntity);
  svc.skuRepo = repo(ProductSkuEntity);
  svc.imageRepo = repo(ProductImageEntity);
  svc.inheritorRepo = repo(InheritorEntity);
  svc.reviewRepo = repo(ReviewEntity);
  svc.favoriteRepo = repo(FavoriteEntity);
  const redis = new FakeRedis();
  svc.redis = redis as any;
  return { svc, redis };
}

/** 造分类（一级 + 二级） */
async function seedCategories() {
  const root = await repo(ProductCategoryEntity).save(
    repo(ProductCategoryEntity).create({ name: '银饰', parentId: 0, sort: 1, status: 1 })
  );
  const child = await repo(ProductCategoryEntity).save(
    repo(ProductCategoryEntity).create({ name: '耳环', parentId: root.id, sort: 1, status: 1 })
  );
  return { root, child };
}

/** 造商品 */
async function seedProduct(categoryId: number, price = 100, overrides: Partial<ProductEntity> = {}) {
  return repo(ProductEntity).save(
    repo(ProductEntity).create({
      title: '苗族银饰', categoryId, merchantId: 1, mainImage: 'x.png', price, stock: 10, status: 1, ...overrides,
    })
  );
}

describe('ClothingService 非遗商品', () => {
  let svc: ClothingService;
  let redis: FakeRedis;

  beforeEach(() => {
    ({ svc, redis } = wireClothingService());
  });

  describe('categoryTree 分类树', () => {
    it('组装一级与二级层级', async () => {
      const { root, child } = await seedCategories();
      await repo(ProductCategoryEntity).save(
        repo(ProductCategoryEntity).create({ name: '停用分类', parentId: 0, status: 0 })
      );
      const tree = await svc.categoryTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('银饰');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe('耳环');
      expect(root.id).toBeGreaterThan(0);
      expect(child.id).toBeGreaterThan(0);
    });
  });

  describe('productList 商品列表', () => {
    it('一级分类包含二级分类商品', async () => {
      const { root, child } = await seedCategories();
      await seedProduct(root.id, 100);
      await seedProduct(child.id, 200, { title: '二级商品' });
      const page = await svc.productList({ categoryId: root.id, page: 1, pageSize: 10 });
      expect(page.total).toBe(2);
    });

    it('价格区间与销量排序', async () => {
      const { root } = await seedCategories();
      await seedProduct(root.id, 50, { title: '低价', sales: 100 });
      await seedProduct(root.id, 150, { title: '中价', sales: 10 });
      await seedProduct(root.id, 300, { title: '高价', sales: 50 });
      const filtered = await svc.productList({ minPrice: 100, maxPrice: 200, page: 1, pageSize: 10 });
      expect(filtered.total).toBe(1);
      expect(filtered.list[0].title).toBe('中价');
      const sorted = await svc.productList({ sort: 'sales', page: 1, pageSize: 10 });
      expect(sorted.list[0].title).toBe('低价');
    });

    it('关键词模糊匹配标题与副标题', async () => {
      const { root } = await seedCategories();
      await seedProduct(root.id, 100, { subtitle: '手工打造' });
      await seedProduct(root.id, 100, { subtitle: '机器生产' });
      const page = await svc.productList({ keyword: '手工', page: 1, pageSize: 10 });
      expect(page.total).toBe(1);
    });
  });

  describe('productDetail 详情', () => {
    it('组装 SKU/图片/传承人/评价并写入缓存', async () => {
      const { root } = await seedCategories();
      const inheritor = await repo(InheritorEntity).save(
        repo(InheritorEntity).create({ name: '张师傅', title: '银饰技艺传承人' })
      );
      const product = await seedProduct(root.id, 100, { inheritorId: inheritor.id });
      await repo(ProductSkuEntity).save(
        repo(ProductSkuEntity).create({ productId: product.id, specName: '小号', price: 100, stock: 5, status: 1 })
      );
      await repo(ProductImageEntity).save(
        repo(ProductImageEntity).create({ productId: product.id, imageUrl: '/a.png', sort: 1 })
      );
      await repo(ReviewEntity).save(
        repo(ReviewEntity).create({ userId: 2, bizType: 'product', bizId: product.id, rating: 5, content: '精美' })
      );
      const detail = await svc.productDetail(product.id);
      expect(detail.skus).toHaveLength(1);
      expect(detail.images).toEqual(['/a.png']);
      expect(detail.inheritor.name).toBe('张师傅');
      expect(detail.reviews).toHaveLength(1);
      expect(detail.reviewCount).toBe(1);
      expect(redis.store.has(`product:detail:${product.id}`)).toBe(true);
      // 第二次命中缓存
      const cached = await svc.productDetail(product.id);
      expect(cached.skus).toHaveLength(1);
    });

    it('商品不存在或下架抛 3005', async () => {
      await expect(svc.productDetail(999)).rejects.toMatchObject({ code: 3005 });
    });
  });

  describe('toggleFavorite 收藏', () => {
    it('收藏与取消收藏', async () => {
      expect((await svc.toggleFavorite(2, 'product', 1)).favorited).toBe(true);
      expect((await svc.toggleFavorite(2, 'product', 1)).favorited).toBe(false);
      expect((await svc.isFavorite(2, 'product', 1)).favorited).toBe(false);
    });

    it('我的收藏展开商品信息', async () => {
      const { root } = await seedCategories();
      const product = await seedProduct(root.id, 88, { subtitle: '手工' });
      await svc.toggleFavorite(2, 'product', product.id);
      const page = await svc.myFavorites(2, 'all', 1, 10);
      expect(page.list).toHaveLength(1);
      expect(page.list[0].title).toBe('苗族银饰');
      expect(Number(page.list[0].price)).toBe(88);
    });
  });

  describe('createReview 评价', () => {
    it('评分越界抛 2001', async () => {
      await expect(
        svc.createReview(2, { bizType: 'product', bizId: 1, rating: 6, content: 'x' })
      ).rejects.toMatchObject({ code: 2001 });
    });

    it('评价后更新商品平均评分', async () => {
      const { root } = await seedCategories();
      const product = await seedProduct(root.id, 100);
      await svc.createReview(2, { bizType: 'product', bizId: product.id, rating: 5, content: '好评' });
      await svc.createReview(3, { bizType: 'product', bizId: product.id, rating: 3, content: '一般' });
      const after = await repo(ProductEntity).findOneBy({ id: product.id });
      expect(Number(after!.rating)).toBe(4);
    });

    it('30 天内可追评且不可重复追评', async () => {
      const review = await svc.createReview(2, { bizType: 'product', bizId: 1, rating: 5, content: '好评' });
      const followed = await svc.followUpReview(2, review.id, '用了两周后补充：很好');
      expect(followed.followUp).toContain('很好');
      await expect(svc.followUpReview(2, review.id, '再补')).rejects.toMatchObject({ code: 3001 });
    });

    it('超过 30 天不可追评', async () => {
      const review = await svc.createReview(2, { bizType: 'product', bizId: 1, rating: 5, content: '好评' });
      await repo(ReviewEntity).query(
        'UPDATE t_review SET created_at = DATE_SUB(NOW(), INTERVAL 40 DAY) WHERE id = ?',
        [review.id]
      );
      await expect(svc.followUpReview(2, review.id, '补评')).rejects.toMatchObject({ code: 3001 });
    });

    it('追评他人评价抛 3005', async () => {
      const review = await svc.createReview(2, { bizType: 'product', bizId: 1, rating: 5, content: '好评' });
      await expect(svc.followUpReview(3, review.id, 'x')).rejects.toMatchObject({ code: 3005 });
    });

    it('评价列表与我的评价', async () => {
      await svc.createReview(2, { bizType: 'product', bizId: 1, rating: 5, content: '好评' });
      await svc.createReview(3, { bizType: 'product', bizId: 1, rating: 4, content: '不错' });
      const list = await svc.reviewList('product', 1, 1, 10);
      expect(list.total).toBe(2);
      expect((await svc.myReviews(2, 1, 10)).list).toHaveLength(1);
    });
  });
});
