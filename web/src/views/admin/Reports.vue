<template>
  <div class="reports-page">
    <h2 class="page-title">举报处理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="处理状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 150px" @change="loadData">
            <el-option label="待处理" :value="0" />
            <el-option label="已处理" :value="1" />
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
        <el-table-column label="举报类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.targetType === 'post'" type="primary">游记</el-tag>
            <el-tag v-else type="info">评论</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetId" label="目标ID" width="100" />
        <el-table-column label="举报原因" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.reason === 'spam'" type="warning">垃圾内容</el-tag>
            <el-tag v-else-if="row.reason === 'abuse'" type="danger">辱骂</el-tag>
            <el-tag v-else-if="row.reason === 'porn'" type="danger">色情</el-tag>
            <el-tag v-else-if="row.reason === 'false'" type="info">虚假信息</el-tag>
            <el-tag v-else>其他</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="举报说明" min-width="200" show-overflow-tooltip />
        <el-table-column label="举报人" width="120">
          <template #default="{ row }">
            {{ row.reporter }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning">待处理</el-tag>
            <el-tag v-else type="success">已处理</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="举报时间" width="180">
          <template #default="{ row }">
            {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column prop="handleNote" label="处理备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button link type="danger" size="small" @click="handleReport(row, true)">下架</el-button>
              <el-button link type="success" size="small" @click="handleReport(row, false)">忽略</el-button>
            </template>
            <span v-else style="color: #909399; font-size: 12px">已处理</span>
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

    <el-dialog v-model="handleVisible" title="处理举报" width="500px">
      <el-form :model="handleForm" label-width="80px">
        <el-form-item label="处理方式">
          <el-radio-group v-model="handleForm.takeDown">
            <el-radio :value="true">下架内容</el-radio>
            <el-radio :value="false">忽略举报</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="handleForm.note"
            type="textarea"
            :rows="4"
            placeholder="请输入处理备注"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmHandle">确定</el-button>
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

const handleVisible = ref(false);
const currentRow = ref<any>(null);
const handleForm = reactive({
  takeDown: false,
  note: '',
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
    const res = await request.get('/admin/community/reports', { params });
    list.value = res.list || [];
    pagination.total = res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function handleReport(row: any, takeDown: boolean) {
  currentRow.value = row;
  handleForm.takeDown = takeDown;
  handleForm.note = '';
  handleVisible.value = true;
}

async function confirmHandle() {
  try {
    await request.post(`/admin/community/reports/${currentRow.value.id}/handle`, {
      takeDown: handleForm.takeDown,
      note: handleForm.note,
    });
    ElMessage.success('处理成功');
    handleVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.reports-page {
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
</style>
