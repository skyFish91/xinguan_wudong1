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
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="shopName" label="店铺名" width="160" />
        <el-table-column label="模块" width="110">
          <template #default="{ row }">{{ moduleText(row.moduleType) }}</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="110" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="licenseNo" label="营业执照号" width="170" />
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
              <el-button link type="success" @click="approve(row)">通过</el-button>
              <el-button link type="danger" @click="reject(row)">驳回</el-button>
            </template>
            <span v-else class="muted">{{ row.rejectReason || '-' }}</span>
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

function moduleText(m: string) {
  const map: Record<string, string> = { clothing: '衣·非遗好物', food: '食·餐饮美食', hotel: '住·民宿住宿', travel: '行·线路订票' };
  return map[m] || m;
}

async function load(p = 1) {
  page.value = p;
  try {
    const data: any = await request.get('/admin/merchant-applies', {
      params: { status: status.value || undefined, page: page.value, pageSize },
    });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function approve(row: any) {
  try {
    await ElMessageBox.confirm(`确定通过「${row.shopName}」的入驻申请？审核通过后该用户将成为商家。`, '提示', { type: 'warning' });
    await request.post(`/admin/merchant-applies/${row.id}/approve`);
    ElMessage.success('已通过');
    load(page.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

async function reject(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回申请');
    await request.post(`/admin/merchant-applies/${row.id}/reject`, { reason: value || '' });
    ElMessage.success('已驳回');
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
