<template>
  <div>
    <TopNav />
    <div class="page">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索路线名称" class="search" clearable @keyup.enter="load(1)" />
        <el-select v-model="days" placeholder="全部天数" clearable class="days-select" @change="load(1)">
          <el-option label="1 日游" :value="1" />
          <el-option label="2 日游" :value="2" />
          <el-option label="3 日游" :value="3" />
        </el-select>
        <el-button type="primary" @click="load(1)">搜索</el-button>
      </div>

      <el-empty v-if="!loading && !list.length" description="暂无路线" />
      <div class="grid">
        <el-card v-for="r in list" :key="r.id" class="item" shadow="hover" @click="$router.push(`/travel/routes/${r.id}`)">
          <img :src="r.mainImage" class="item-img" />
          <div class="item-title">{{ r.title }}</div>
          <div class="item-sub">{{ r.departFrom }} 出发 · {{ r.dest }} · {{ r.days }} 天</div>
          <div class="tags">
            <el-tag v-for="t in splitTags(r.themes)" :key="t" size="small" class="tag">{{ t }}</el-tag>
          </div>
          <div class="item-bottom">
            <span class="price">¥{{ r.price }}/人</span>
            <span class="sales">已售 {{ r.sales }}</span>
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
const days = ref<number | undefined>(undefined);
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 8;
const loading = ref(false);

function splitTags(tags: string) {
  return tags ? tags.split(',').filter(t => t) : [];
}

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const data: any = await request.get('/travel/routes', {
      params: {
        days: days.value,
        keyword: keyword.value || undefined,
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
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.search {
  width: 280px;
}
.days-select {
  width: 140px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.item {
  cursor: pointer;
}
.item-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 4px;
}
.item-title {
  margin-top: 8px;
  font-weight: 600;
}
.item-sub {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.tags {
  margin-top: 6px;
}
.tag {
  margin-right: 4px;
}
.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.price {
  color: #c0392b;
  font-weight: bold;
}
.sales {
  font-size: 12px;
  color: #999;
}
.pager {
  margin-top: 20px;
  justify-content: center;
}
</style>
