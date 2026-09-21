<template>
  <div class="statistics-page">
    <h2 class="page-title">数据统计</h2>

    <el-card class="chart-card">
      <template #header>销售额趋势（近7天）</template>
      <div v-if="salesTrend.length > 0" ref="salesChart" class="chart-container"></div>
      <div v-else class="empty-chart">暂无数据</div>
    </el-card>

    <el-card class="chart-card">
      <template #header>订单类型分布</template>
      <div v-if="orderDistribution.length > 0" ref="orderChart" class="chart-container"></div>
      <div v-else class="empty-chart">暂无数据</div>
    </el-card>

    <el-card class="chart-card">
      <template #header>商品销量 Top 10</template>
      <el-table v-if="topProducts.length > 0" :data="topProducts">
        <el-table-column prop="rank" label="排名" width="80" />
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="sales" label="销量" width="100" />
        <el-table-column prop="revenue" label="销售额" width="120">
          <template #default="{ row }">¥{{ row.revenue }}</template>
        </el-table-column>
      </el-table>
      <div v-else class="empty-chart">暂无数据</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue';
import * as echarts from 'echarts';
import request from '../../api/request';

const salesTrend = ref<any[]>([]);
const orderDistribution = ref<any[]>([]);
const topProducts = ref<any[]>([]);

const salesChart = ref<HTMLElement>();
const orderChart = ref<HTMLElement>();

async function loadData() {
  try {
    const res: any = await request.get('/merchant/statistics');
    salesTrend.value = res.salesTrend || [];
    orderDistribution.value = res.orderDistribution || [];
    topProducts.value = res.topProducts || [];

    await nextTick();
    if (salesTrend.value.length > 0) initSalesChart();
    if (orderDistribution.value.length > 0) initOrderChart();
  } catch {
    // 错误已处理
  }
}

function initSalesChart() {
  if (!salesChart.value) return;
  const chart = echarts.init(salesChart.value);
  const dates = salesTrend.value.map(item => item.date.split('T')[0]);
  const amounts = salesTrend.value.map(item => item.amount);

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>销售额: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [{
      data: amounts,
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#D4A017'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: 'rgba(212, 160, 23, 0.3)'
          }, {
            offset: 1,
            color: 'rgba(212, 160, 23, 0.05)'
          }]
        }
      }
    }]
  });
}

function initOrderChart() {
  if (!orderChart.value) return;
  const chart = echarts.init(orderChart.value);
  const data = orderDistribution.value.map(item => ({
    name: item.name,
    value: item.count
  }));

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      bottom: '5%',
      left: 'center'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}'
      },
      data: data,
      color: ['#D4A017', '#667eea', '#764ba2', '#f093fb']
    }]
  });
}

onMounted(loadData);
</script>

<style scoped>
.statistics-page {
  padding: 24px;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.chart-card {
  margin-bottom: 24px;
}

.chart-container {
  height: 350px;
  width: 100%;
}

.empty-chart {
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  color: #909399;
  font-size: 14px;
}
</style>
