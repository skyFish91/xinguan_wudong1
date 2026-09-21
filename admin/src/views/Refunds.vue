<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-radio-group v-model="status" @change="load(1)">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="0">待审核</el-radio-button>
          <el-radio-button value="1">已通过</el-radio-button>
          <el-radio-button value="2">已驳回</el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="list" border>
        <el-table-column prop="refundNo" label="退款单号" width="170" />
        <el-table-column prop="orderNo" label="订单号" width="170" />
        <el-table-column label="订单类型" width="100">
          <template #default="{ row }">{{ orderTypeText(row.orderType) }}</template>
        </el-table-column>
        <el-table-column prop="userNickname" label="申请人" width="110" />
        <el-table-column prop="amount" label="金额" width="100" />
        <el-table-column prop="reason" label="原因" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'warning'" size="small">
              {{ row.status === 0 ? '待审核' : row.status === 1 ? '已通过' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button link type="success" @click="handle(row, true)">同意退款</el-button>
              <el-button link type="danger" @click="handle(row, false)">驳回</el-button>
            </template>
            <span v-else class="muted">{{ row.handleNote || '-' }}</span>
          </template>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const status = ref('');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;

function orderTypeText(t: string) {
  const map: Record<string, string> = { goods: '实物商品', meal: '餐位预订', hotel: '住宿预订', ticket: '门票', route: '路线' };
  return map[t] || t;
}

async function load(p = 1) {
  page.value = p;
  try {
    const data: any = await request.get('/admin/refunds', {
      params: { status: status.value || undefined, page: page.value, pageSize },
    });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function handle(row: any, approve: boolean) {
  const tip = approve ? '同意退款将回补库存并原路退款，确定？' : '确定驳回该退款申请？';
  try {
    const { value } = await ElMessageBox.prompt(tip, '审批', {
      inputPlaceholder: approve ? '处理备注（选填）' : '驳回原因',
    });
    await request.post(`/admin/refunds/${row.id}/handle`, { approve, note: value || '' });
    ElMessage.success('已处理');
    load(page.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

onMounted(() => load(1));
</script>

<style scoped>
.toolbar {
  margin-bottom: 14px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.muted {
  color: #999;
  font-size: 12px;
}
</style>
