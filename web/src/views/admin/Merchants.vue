<template>
  <div class="merchants-page">
    <h2 class="page-title">商家管理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="审核状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 150px" @change="loadData">
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="申请用户" width="150">
          <template #default="{ row }">
            <div v-if="row.user">
              <div>{{ row.user.nickname }}</div>
              <div style="color: #909399; font-size: 12px">{{ row.user.phone }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="shopName" label="店铺名称" width="180" />
        <el-table-column label="业务类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.moduleType === 'clothing'" type="info">服饰</el-tag>
            <el-tag v-else-if="row.moduleType === 'food'" type="warning">餐饮</el-tag>
            <el-tag v-else-if="row.moduleType === 'hotel'" type="success">民宿</el-tag>
            <el-tag v-else-if="row.moduleType === 'travel'" type="primary">景区</el-tag>
            <el-tag v-else>其他</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="licenseNo" label="营业执照号" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning">待审核</el-tag>
            <el-tag v-else-if="row.status === 1" type="success">已通过</el-tag>
            <el-tag v-else type="danger">已驳回</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">
            {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button link type="primary" size="small" @click="handleApprove(row)">通过</el-button>
              <el-button link type="danger" size="small" @click="handleReject(row)">驳回</el-button>
            </template>
            <el-button link type="info" size="small" @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="申请详情" width="600px">
      <el-descriptions v-if="currentRow" :column="1" border>
        <el-descriptions-item label="店铺名称">{{ currentRow.shopName }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">
          <el-tag v-if="currentRow.moduleType === 'clothing'" type="info">服饰</el-tag>
          <el-tag v-else-if="currentRow.moduleType === 'food'" type="warning">餐饮</el-tag>
          <el-tag v-else-if="currentRow.moduleType === 'hotel'" type="success">民宿</el-tag>
          <el-tag v-else-if="currentRow.moduleType === 'travel'" type="primary">景区</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ currentRow.contact }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentRow.contactPhone }}</el-descriptions-item>
        <el-descriptions-item label="营业执照号">{{ currentRow.licenseNo }}</el-descriptions-item>
        <el-descriptions-item label="申请材料">
          <div v-if="currentRow.materials" class="materials">
            <el-image
              v-for="(url, idx) in currentRow.materials.split(',')"
              :key="idx"
              :src="url"
              :preview-src-list="currentRow.materials.split(',')"
              :initial-index="idx"
              style="width: 100px; height: 100px; margin-right: 8px; cursor: pointer"
              fit="cover"
            />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ dayjs(currentRow.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentRow.status === 2" label="驳回原因">
          <span style="color: #f56c6c">{{ currentRow.rejectReason }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回申请" width="500px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回原因">
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入驳回原因"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确定驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import dayjs from 'dayjs';

const loading = ref(false);
const list = ref<any[]>([]);
const filters = reactive({
  status: undefined as number | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const detailVisible = ref(false);
const rejectVisible = ref(false);
const currentRow = ref<any>(null);
const rejectForm = reactive({
  reason: '',
});

async function loadData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (filters.status !== undefined) {
      params.status = filters.status;
    }
    const res = await request.get('/admin/merchant-applies', { params });
    list.value = res.list || [];
    pagination.total = res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function handleApprove(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认通过「${row.shopName}」的入驻申请？`,
      '审核通过',
      { type: 'warning' }
    );
    await request.post(`/admin/merchant-applies/${row.id}/approve`);
    ElMessage.success('审核通过');
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
}

function handleReject(row: any) {
  currentRow.value = row;
  rejectForm.reason = '';
  rejectVisible.value = true;
}

async function confirmReject() {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入驳回原因');
    return;
  }
  try {
    await request.post(`/admin/merchant-applies/${currentRow.value.id}/reject`, {
      reason: rejectForm.reason,
    });
    ElMessage.success('已驳回');
    rejectVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  }
}

function handleViewDetail(row: any) {
  currentRow.value = row;
  detailVisible.value = true;
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.merchants-page {
  padding: 0;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.materials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
