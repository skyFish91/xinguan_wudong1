<template>
  <div>
    <TopNav />

    <!-- Hero 背景区域 -->
    <div class="hero-section">
      <div class="hero-overlay">
        <h1 class="hero-title">民俗住宿</h1>
        <p class="hero-subtitle">体验苗家风情民宿，感受乡村田园生活</p>
      </div>
    </div>

    <div class="page">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索民宿名称/地址" class="search" clearable @keyup.enter="load(1)" />
        <el-button type="primary" @click="load(1)">搜索</el-button>
        <div class="price-range">
          价格
          <el-input-number v-model="minPrice" :min="0" :max="9999" :controls="false" placeholder="最低" class="price-input" />
          -
          <el-input-number v-model="maxPrice" :min="0" :max="9999" :controls="false" placeholder="最高" class="price-input" />
        </div>
        <el-button @click="load(1)">筛选</el-button>
        <el-radio-group v-model="sort" class="sorts" @change="load(1)">
          <el-radio-button value="rating">评分优先</el-radio-button>
          <el-radio-button value="price_asc">价格升序</el-radio-button>
        </el-radio-group>
      </div>

      <el-empty v-if="!loading && !list.length" description="暂无民宿" />
      <div class="grid">
        <el-card v-for="h in list" :key="h.id" class="item" shadow="hover" @click="$router.push(`/hotel/${h.id}`)">
          <img :src="h.mainImage" class="item-img" />
          <div class="item-title">{{ h.name }}</div>
          <div class="item-sub">{{ h.address }}</div>
          <div class="tags">
            <el-tag v-for="t in splitTags(h.styleTags)" :key="t" size="small" class="tag">{{ t }}</el-tag>
          </div>
          <div class="item-bottom">
            <span class="price"><span v-if="h.minPrice !== null && h.minPrice !== undefined">¥{{ h.minPrice }} 起</span></span>
            <span class="sales">评分 {{ h.rating }}</span>
          </div>
        </el-card>
      </div>

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
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const keyword = ref('');
const minPrice = ref<number | undefined>(undefined);
const maxPrice = ref<number | undefined>(undefined);
const sort = ref('rating');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const loading = ref(false);

function splitTags(tags: string) {
  return tags ? tags.split(',').filter(t => t) : [];
}

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const data: any = await request.get('/hotel/homestays', {
      params: {
        keyword: keyword.value || undefined,
        minPrice: minPrice.value,
        maxPrice: maxPrice.value,
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

onMounted(() => load());
</script>

<style scoped>
/* Hero 区域 */
.hero-section {
  position: relative;
  height: 450px;
  background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)), url('/uploads/banner/民宿住宿 .jpg');
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #FAFAF8;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.search {
  width: 260px;
}
.price-range {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
  margin-left: 12px;
  font-size: 14px;
}
.price-input {
  width: 90px;
}
.sorts {
  margin-left: auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.item {
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(212, 160, 23, 0.2);
  border-color: #D4A017;
}
.item-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 0;
}
.item-title {
  margin-top: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #2C2C2C;
  line-height: 1.6;
}
.item-sub {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.6;
}
.tags {
  margin-top: 6px;
}
.tag {
  margin-right: 4px;
  margin-top: 4px;
}
.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.price {
  color: #D4A017;
  font-weight: bold;
  font-size: 18px;
}
.sales {
  font-size: 14px;
  color: #888;
}
.pager {
  margin-top: 40px;
  justify-content: center;
}
</style>
