<template>
  <div>
    <TopNav />

    <!-- Hero 背景区域 -->
    <div class="hero-section">
      <div class="hero-overlay">
        <h1 class="hero-title">非遗好物</h1>
        <p class="hero-subtitle">探寻苗乡传统工艺，体验非遗文化魅力</p>
      </div>
    </div>

    <div class="page">
      <!-- 搜索与排序 -->
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索非遗好物" class="search" clearable @keyup.enter="load(1)" />
        <el-button type="primary" @click="load(1)">搜索</el-button>
        <el-radio-group v-model="sort" class="sorts" @change="load(1)">
          <el-radio-button value="default">综合</el-radio-button>
          <el-radio-button value="sales">销量</el-radio-button>
          <el-radio-button value="price_asc">价格升序</el-radio-button>
          <el-radio-button value="price_desc">价格降序</el-radio-button>
        </el-radio-group>
      </div>

      <div class="body">
        <!-- 分类树 -->
        <div class="side">
          <div
            v-for="c in categories"
            :key="c.id"
            class="cat"
            :class="{ active: topCatId === c.id }"
            @click="onTopCat(c)"
          >
            {{ c.name }}
          </div>
        </div>

        <!-- 商品 -->
        <div class="main">
          <div v-if="subCats.length" class="sub-cats">
            <el-tag
              v-for="s in subCats"
              :key="s.id"
              :effect="categoryId === s.id ? 'dark' : 'plain'"
              class="sub-tag"
              @click="onSubCat(s)"
            >
              {{ s.name }}
            </el-tag>
          </div>

          <el-empty v-if="!loading && !list.length" description="暂无商品" />
          <TransitionGroup name="product-card" tag="div" class="grid">
            <el-card v-for="p in list" :key="p.id" class="item" shadow="hover" @click="$router.push(`/clothing/${p.id}`)">
              <img :src="p.mainImage" class="item-img" />
              <div class="item-title">{{ p.title }}</div>
              <div class="item-sub">{{ p.subtitle }}</div>
              <div class="item-bottom">
                <span class="price">¥{{ p.price }}</span>
                <span class="sales">已售 {{ p.sales }}</span>
              </div>
            </el-card>
          </TransitionGroup>

          <el-pagination
            v-if="total > pageSize"
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            class="pager"
            @current-change="load"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const categories = ref<any[]>([]);
const topCatId = ref<number>(0);
const subCats = ref<any[]>([]);
const categoryId = ref<number | undefined>(undefined);
const keyword = ref('');
const sort = ref('default');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const loading = ref(false);

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const data: any = await request.get('/clothing/products', {
      params: {
        categoryId: categoryId.value,
        keyword: keyword.value || undefined,
        sort: sort.value,
        page: page.value,
        pageSize,
      },
    });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch {
    // 已提示
  } finally {
    loading.value = false;
  }
}

function onTopCat(c: any) {
  topCatId.value = c.id;
  subCats.value = c.children || [];
  // 顶级分类需要传给后端；后端会自动包含其下的二级分类。
  categoryId.value = c.id;
  load(1);
}

function onSubCat(s: any) {
  categoryId.value = categoryId.value === s.id ? undefined : s.id;
  load(1);
}

onMounted(async () => {
  try {
    categories.value = await request.get('/clothing/categories');
  } catch {
    // 已提示
  }
  load(1);
});
</script>

<style scoped>
/* Hero 区域 */
.hero-section {
  position: relative;
  height: 450px;
  background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)), url('/uploads/banner/非遗好物.jpg');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.hero-overlay {
  text-align: center;
  color: white;
  z-index: 1;
  padding: 0 24px;
}

.hero-title {
  font-size: 72px;
  font-weight: 800;
  margin: 0 0 24px 0;
  letter-spacing: 4px;
  text-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 24px;
  margin: 0;
  opacity: 0.98;
  font-weight: 300;
  letter-spacing: 2px;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
}

.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 64px;
  background: #FAFAF8;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
  padding: 20px 28px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.search {
  width: 380px;
}

.sorts {
  display: flex;
  gap: 0;
}

.body {
  display: flex;
  gap: 20px;
}

.side {
  width: 200px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  padding: 20px 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  align-self: flex-start;
  position: sticky;
  top: 24px;
}

.cat {
  padding: 14px 18px;
  cursor: pointer;
  color: #333;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s ease;
  position: relative;
}

.cat::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: #D4A017;
  border-radius: 0 2px 2px 0;
  transition: height 0.25s ease;
}

.cat:hover {
  background: #FFF9E6;
  color: #D4A017;
  transform: translateX(4px);
}

.cat:hover::before {
  height: 60%;
}

.cat.active {
  background: #D4A017;
  color: white;
  box-shadow: 0 4px 12px rgba(212, 160, 23, 0.3);
  transform: translateX(4px);
}

.cat.active::before {
  height: 0;
}

.main {
  flex: 1;
  min-width: 0;
}

.sub-cats {
  margin-bottom: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.sub-tag {
  cursor: pointer;
  transition: all 0.25s ease;
  border-radius: 6px;
}

.sub-tag:hover {
  transform: translateY(-2px);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.item {
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  background: white;
  display: flex;
  flex-direction: column;
  height: 360px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.item:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 28px rgba(212, 160, 23, 0.2);
  border-color: #D4A017;
}

.item-img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
  flex-shrink: 0;
}

.item:hover .item-img {
  transform: scale(1.1);
}

.item :deep(.el-card__body) {
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
  line-height: 1.6;
}

.item-sub {
  font-size: 14px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 14px;
  line-height: 1.6;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.price {
  color: #D4A017;
  font-weight: 800;
  font-size: 22px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: -0.5px;
}

.sales {
  font-size: 14px;
  color: #888;
  font-weight: 400;
}

.pager {
  margin-top: 48px;
  justify-content: center;
}
.product-card-enter-active,
.product-card-move {
  transition: opacity 0.32s ease, transform 0.32s ease;
}
.product-card-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
@media (prefers-reduced-motion: reduce) {
  .item,
  .item-img,
  .product-card-enter-active,
  .product-card-move {
    transition: none;
  }
}
</style>
