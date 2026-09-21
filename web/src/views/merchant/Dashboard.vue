<template>
  <div class="dashboard">
    <h2 class="page-title">数据概览</h2>

    <!-- 关键指标卡片 -->
    <div class="metrics">
      <el-card class="metric-card">
        <div class="metric-icon orders">📦</div>
        <div class="metric-content">
          <div class="metric-value">{{ stats.todayOrders }}</div>
          <div class="metric-label">今日订单</div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-icon sales">💰</div>
        <div class="metric-content">
          <div class="metric-value">¥{{ stats.todaySales }}</div>
          <div class="metric-label">今日销售额</div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-icon pending">⏳</div>
        <div class="metric-content">
          <div class="metric-value">{{ stats.pendingOrders }}</div>
          <div class="metric-label">待处理订单</div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-icon products">🏪</div>
        <div class="metric-content">
          <div class="metric-value">{{ stats.totalProducts }}</div>
          <div class="metric-label">商品总数</div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-icon revenue">📈</div>
        <div class="metric-content">
          <div class="metric-value">¥{{ stats.monthRevenue }}</div>
          <div class="metric-label">本月收入</div>
        </div>
      </el-card>
    </div>

    <!-- 最近订单 -->
    <el-card class="recent-orders">
      <template #header>
        <div class="card-header">
          <span>最近订单</span>
          <el-button text type="primary" @click="$router.push('/merchant/orders')">查看全部</el-button>
        </div>
      </template>
      <el-table :data="recentOrders" style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="userName" label="用户" width="120" />
        <el-table-column prop="productName" label="商品/服务" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" width="160" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import request from '../../api/request';

const stats = reactive({
  todayOrders: 0,
  todaySales: 0,
  pendingOrders: 0,
  totalProducts: 0,
  monthRevenue: 0,
});

const recentOrders = ref<any[]>([]);

function getStatusType(status: string) {
  const map: Record<string, any> = {
    '待付款': 'warning',
    '待发货': 'info',
    '已发货': 'primary',
    '已完成': 'success',
    '已取消': 'info',
  };
  return map[status] || 'info';
}

async function loadData() {
  try {
    const data: any = await request.get('/merchant/dashboard');
    Object.assign(stats, data.stats);
    recentOrders.value = data.recentOrders || [];
  } catch {
    // 错误已由拦截器处理
  }
}

onMounted(loadData);
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.metric-icon.orders {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.metric-icon.sales {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon.pending {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.metric-icon.products {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.revenue {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 13px;
  color: #909399;
}

.recent-orders {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
