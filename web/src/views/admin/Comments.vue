<template>
  <div class="comments-page">
    <h2 class="page-title">评论管理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="游记ID">
          <el-input
            v-model="filters.postId"
            placeholder="游记ID"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="已隐藏" :value="0" />
            <el-option label="正常" :value="1" />
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
        <el-table-column prop="postId" label="游记ID" width="100" />
        <el-table-column label="评论用户" width="150">
          <template #default="{ row }">
            <div v-if="row.user">
              <el-avatar :size="32" :src="row.user.avatar" />
              <span style="margin-left: 8px">{{ row.user.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评论内容" min-width="300" show-overflow-tooltip />
        <el-table-column label="点赞数" width="100">
          <template #default="{ row }">
            {{ row.likeCount }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="danger">已隐藏</el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评论时间" width="180">
          <template #default="{ row }">
            {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              :type="row.status === 0 ? 'success' : 'danger'"
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 0 ? '恢复' : '隐藏' }}
            </el-button>
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
  postId: '',
  status: undefined as number | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

async function loadData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (filters.postId) {
      params.postId = filters.postId;
    }
    if (filters.status !== undefined) {
      params.status = filters.status;
    }
    const res = await request.get('/admin/community/comments', { params });
    list.value = res.list || [];
    pagination.total = res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function handleToggleStatus(row: any) {
  try {
    const action = row.status === 0 ? '恢复' : '隐藏';
    const newStatus = row.status === 0 ? 1 : 0;
    await ElMessageBox.confirm(`确认${action}该评论？`, '提示', { type: 'warning' });
    await request.post(`/admin/community/comments/${row.id}/status`, {
      status: newStatus,
    });
    ElMessage.success(`${action}成功`);
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.comments-page {
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
