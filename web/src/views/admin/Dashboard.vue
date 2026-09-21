<template>
  <div class="dashboard-page">
    <h2 class="page-title">数据概览</h2>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-label">平台总用户数</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-label">商家数</div>
          <div class="stat-value">{{ stats.totalMerchants }}</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-label">订单总数</div>
          <div class="stat-value">{{ stats.totalOrders }}</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-label">总交易额</div>
          <div class="stat-value">¥{{ stats.totalRevenue }}</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-label">今日新增用户</div>
          <div class="stat-value">{{ stats.todayUsers }}</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-label">今日订单数</div>
          <div class="stat-value">{{ stats.todayOrders }}</div>
        </div>
      </el-card>
    </div>

    <!-- 图表区 -->
    <el-row :gutter="24" style="margin-top: 24px">
      <el-col :span="12">
        <el-card>
          <template #header>近7天新增用户</template>
          <div v-if="userTrend.length > 0" ref="userChart" class="chart-container"></div>
          <div v-else class="empty-chart">暂无数据</div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>近7天订单数</template>
          <div v-if="orderTrend.length > 0" ref="orderChart" class="chart-container"></div>
          <div v-else class="empty-chart">暂无数据</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';
import * as echarts from 'echarts';
import request from '../../api/request';

const stats = ref({
  totalUsers: 0,
  totalMerchants: 0,
  totalOrders: 0,
  totalRevenue: 0,
  todayUsers: 0,
  todayOrders: 0,
});

const userTrend = ref<any[]>([]);
const orderTrend = ref<any[]>([]);

const userChart = ref<HTMLElement>();
const orderChart = ref<HTMLElement>();

async function loadData() {
  try {
    const res: any = await request.get('/admin/dashboard');
    stats.value = res.stats || stats.value;
    userTrend.value = res.userTrend || [];
    orderTrend.value = res.orderTrend || [];

    await nextTick();
    if (userTrend.value.length > 0) initUserChart();
    if (orderTrend.value.length > 0) initOrderChart();
  } catch {
    // 错误已处理
  }
}

function initUserChart() {
  if (!userChart.value) return;
  const chart = echarts.init(userChart.value);
  const dates = userTrend.value.map(item => item.date.split('T')[0]);
  const counts = userTrend.value.map(item => item.count);

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [{
      data: counts,
      type: 'bar',
      itemStyle: { color: '#1890ff' }
    }]
  });
}

function initOrderChart() {
  if (!orderChart.value) return;
  const chart = echarts.init(orderChart.value);
  const dates = orderTrend.value.map(item => item.date.split('T')[0]);
  const counts = orderTrend.value.map(item => item.count);

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [{
      data: counts,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#52c41a' }
    }]
  });
}

onMounted(loadData);
</script>

<style scoped>
.dashboard-page {
  padding: 0;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
}

.stat-card :deep(.el-card__body) {
  padding: 24px;
}

.stat-content {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.empty-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  color: #909399;
  font-size: 14px;
}
</style>
