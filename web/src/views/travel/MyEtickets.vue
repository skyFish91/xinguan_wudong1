<template>
  <div>
    <TopNav />
    <div class="page">
      <h2>我的电子票</h2>
      <el-empty v-if="!list.length" description="暂无电子票，去景区订票或购买路线吧" />
      <div class="grid">
        <el-card v-for="e in list" :key="e.id" class="ticket">
          <div class="ticket-head">
            <span class="ticket-name">{{ e.bizType === 'route' ? '路线套餐' : '景区门票' }}</span>
            <el-tag :type="statusTag(e.status)" size="small">{{ statusText(e.status) }}</el-tag>
          </div>
          <div class="ticket-code">票号：{{ e.code }}</div>
          <div class="ticket-line">游客：{{ e.visitorName }}</div>
          <div class="ticket-line">使用日期：{{ e.useDate }}</div>
          <div class="ticket-line" v-if="e.verifyAt">核销时间：{{ formatTime(e.verifyAt) }}</div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const list = ref<any[]>([]);

function statusText(status: number) {
  return status === 0 ? '未核销' : status === 1 ? '已核销' : '已退款';
}

function statusTag(status: number): 'success' | 'info' | 'warning' {
  return status === 0 ? 'warning' : status === 1 ? 'success' : 'info';
}

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

onMounted(async () => {
  try {
    list.value = await request.get('/travel/my-etickets');
  } catch {
    // 已提示
  }
});
</script>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.ticket-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ticket-name {
  font-weight: 600;
}
.ticket-code {
  margin-top: 10px;
  color: #c0392b;
  font-weight: 600;
  letter-spacing: 1px;
}
.ticket-line {
  margin-top: 6px;
  color: #666;
  font-size: 13px;
}
</style>
