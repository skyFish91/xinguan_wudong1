<template>
  <div class="orders-page">
    <h2 class="page-title">订单管理</h2>

    <!-- 筛选工具栏 -->
    <el-card class="toolbar">
      <el-input v-model="keyword" placeholder="搜索订单号/用户" style="width: 280px" clearable @keyup.enter="load(1)" />
      <el-select v-model="orderType" placeholder="订单类型" style="width: 140px; margin-left: 12px" clearable @change="load(1)">
        <el-option label="商品订单" value="product" />
        <el-option label="餐饮订单" value="restaurant" />
        <el-option label="民宿订单" value="hotel" />
        <el-option label="门票订单" value="ticket" />
      </el-select>
      <el-select v-model="orderStatus" placeholder="订单状态" style="width: 140px; margin-left: 12px" clearable @change="load(1)">
        <el-option label="待付款" value="pending" />
        <el-option label="待发货" value="paid" />
        <el-option label="已发货" value="shipped" />
        <el-option label="已完成" value="completed" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
      <el-button type="primary" @click="load(1)" style="margin-left: 12px">搜索</el-button>
    </el-card>

    <!-- 订单列表 -->
    <el-card>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="userName" label="用户" width="120" />
        <el-table-column label="商品/服务" min-width="200">
          <template #default="{ row }">
            <div class="order-item">
              <img v-if="row.productImage" :src="row.productImage" class="item-img" />
              <span>{{ row.productName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="金额" width="100">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="viewDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'paid'" text type="success" @click="shipOrder(row)">发货</el-button>
            <el-button v-if="row.status === 'pending'" text type="warning" @click="cancelOrder(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        layout="prev, pager, next"
        style="margin-top: 16px; text-align: center"
        @current-change="load"
      />
    </el-card>

    <!-- 订单详情对话框 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <div v-if="currentOrder" class="detail-content">
        <div class="detail-row">
          <span class="label">订单号：</span>
          <span>{{ currentOrder.orderNo }}</span>
        </div>
        <div class="detail-row">
          <span class="label">用户：</span>
          <span>{{ currentOrder.userName }}</span>
        </div>
        <div class="detail-row">
          <span class="label">商品/服务：</span>
          <span>{{ currentOrder.productName }}</span>
        </div>
        <div class="detail-row">
          <span class="label">数量：</span>
          <span>{{ currentOrder.quantity }}</span>
        </div>
        <div class="detail-row">
          <span class="label">金额：</span>
          <span class="amount">¥{{ currentOrder.amount }}</span>
        </div>
        <div class="detail-row">
          <span class="label">下单时间：</span>
          <span>{{ currentOrder.createTime }}</span>
        </div>
        <div class="detail-row">
          <span class="label">状态：</span>
          <el-tag :type="getStatusType(currentOrder.status)">{{ getStatusText(currentOrder.status) }}</el-tag>
        </div>
        <div v-if="currentOrder.remark" class="detail-row">
          <span class="label">备注：</span>
          <span>{{ currentOrder.remark }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

const keyword = ref('');
const orderType = ref('');
const orderStatus = ref('');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);

const detailVisible = ref(false);
const currentOrder = ref<any>(null);

const statusMap: Record<string, string> = {
  pending: '待付款',
  paid: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};

function getStatusText(status: string) {
  return statusMap[status] || status;
}

function getStatusType(status: string) {
  const map: Record<string, any> = {
    pending: 'warning',
    paid: 'info',
    shipped: 'primary',
    completed: 'success',
    cancelled: 'info',
  };
  return map[status] || 'info';
}

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const res: any = await request.get('/merchant/orders', {
      params: {
        page: p,
        pageSize,
        keyword: keyword.value,
        type: orderType.value,
        status: orderStatus.value,
      },
    });
    list.value = res.list || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
}

function viewDetail(row: any) {
  currentOrder.value = row;
  detailVisible.value = true;
}

async function shipOrder(row: any) {
  try {
    await ElMessageBox.prompt('请输入物流单号', '发货', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await request.post(`/merchant/orders/${row.id}/ship`, { trackingNo: '' });
    ElMessage.success('发货成功');
    load(page.value);
  } catch (err: any) {
    if (err !== 'cancel') {
      // 错误已处理
    }
  }
}

async function cancelOrder(row: any) {
  try {
    await ElMessageBox.confirm('确定取消该订单吗？', '提示', { type: 'warning' });
    await request.post(`/merchant/orders/${row.id}/cancel`);
    ElMessage.success('取消成功');
    load(page.value);
  } catch (err: any) {
    if (err !== 'cancel') {
      // 错误已处理
    }
  }
}

onMounted(load);
</script>

<style scoped>
.orders-page {
  padding: 24px;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.toolbar {
  margin-bottom: 16px;
}

.toolbar :deep(.el-card__body) {
  display: flex;
  align-items: center;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.detail-content {
  padding: 8px 0;
}

.detail-row {
  display: flex;
  margin-bottom: 16px;
  line-height: 1.6;
}

.detail-row .label {
  width: 100px;
  color: #606266;
  flex-shrink: 0;
}

.detail-row .amount {
  color: #f56c6c;
  font-weight: 600;
  font-size: 16px;
}
</style>
