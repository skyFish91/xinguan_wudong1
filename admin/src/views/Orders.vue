<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-select v-model="status" placeholder="全部状态" clearable class="select" @change="load(1)">
          <el-option v-for="(t, s) in statusTexts" :key="s" :label="t" :value="Number(s)" />
        </el-select>
        <el-select v-model="orderType" placeholder="全部类型" clearable class="select" @change="load(1)">
          <el-option label="实物商品" value="goods" />
          <el-option label="餐位预订" value="meal" />
          <el-option label="住宿预订" value="hotel" />
          <el-option label="门票" value="ticket" />
          <el-option label="路线" value="route" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索订单号" class="search" clearable @keyup.enter="load(1)" />
        <el-button type="primary" @click="load(1)">查询</el-button>
      </div>

      <el-table :data="list" border>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ orderTypeText(row.orderType) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="内容" />
        <el-table-column prop="totalAmount" label="金额" width="100" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ statusTexts[row.status] || `状态${row.status}` }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        layout="prev, pager, next, total"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        class="pager"
        @current-change="load"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import request from '../api/request';

const status = ref<number | undefined>(undefined);
const orderType = ref('');
const keyword = ref('');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;

const statusTexts: Record<number, string> = {
  0: '待支付', 1: '已支付', 2: '已确认', 3: '进行中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
};

function orderTypeText(t: string) {
  const map: Record<string, string> = { goods: '实物商品', meal: '餐位预订', hotel: '住宿预订', ticket: '门票', route: '路线' };
  return map[t] || t;
}

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

async function load(p = 1) {
  page.value = p;
  try {
    const data: any = await request.get('/admin/orders', {
      params: {
        status: status.value,
        orderType: orderType.value || undefined,
        keyword: keyword.value || undefined,
        page: page.value,
        pageSize,
      },
    });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch {
    // 已提示
  }
}

onMounted(() => load(1));
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.select {
  width: 140px;
}
.search {
  width: 220px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
</style>
