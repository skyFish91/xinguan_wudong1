<template>
  <div class="posts-page">
    <h2 class="page-title">游记管理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="审核状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 150px" @change="loadData">
            <el-option label="待审核" :value="0" />
            <el-option label="已发布" :value="1" />
            <el-option label="已驳回" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="标题/内容"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="作者" width="150">
          <template #default="{ row }">
            <div v-if="row.author">
              <el-avatar :size="32" :src="row.author.avatar" />
              <span style="margin-left: 8px">{{ row.author.nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.images"
              :src="getImageList(row.images)[0]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-src-list="getImageList(row.images)"
            />
          </template>
        </el-table-column>
        <el-table-column label="数据" width="180">
          <template #default="{ row }">
            <div style="font-size: 12px; color: #909399">
              <div>浏览 {{ row.viewCount }} · 点赞 {{ row.likeCount }}</div>
              <div>评论 {{ row.commentCount }} · 收藏 {{ row.favoriteCount }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning">待审核</el-tag>
            <el-tag v-else-if="row.status === 1" type="success">已发布</el-tag>
            <el-tag v-else type="danger">已驳回</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="精选" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isHot === 1" type="danger" effect="dark">精选</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发布时间" width="180">
          <template #default="{ row }">
            {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="info" size="small" @click="handleViewDetail(row)">详情</el-button>
            <template v-if="row.status === 0">
              <el-button link type="success" size="small" @click="handleAudit(row, true)">通过</el-button>
              <el-button link type="danger" size="small" @click="handleAudit(row, false)">驳回</el-button>
            </template>
            <el-button link type="warning" size="small" @click="handleToggleHot(row)">
              {{ row.isHot === 1 ? '取消精选' : '设为精选' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="detailVisible" title="游记详情" width="800px">
      <div v-if="currentRow" class="post-detail">
        <h3>{{ currentRow.title }}</h3>
        <div class="post-meta">
          <span>作者：{{ currentRow.author?.nickname }}</span>
          <span style="margin-left: 16px">发布时间：{{ dayjs(currentRow.createdAt).format('YYYY-MM-DD HH:mm:ss') }}</span>
        </div>
        <div class="post-images" v-if="currentRow.images">
          <el-image
            v-for="(url, idx) in getImageList(currentRow.images)"
            :key="idx"
            :src="url"
            fit="cover"
            style="width: 120px; height: 120px; margin-right: 8px; border-radius: 4px"
            :preview-src-list="getImageList(currentRow.images)"
            :initial-index="idx"
          />
        </div>
        <div class="post-content">{{ currentRow.content }}</div>
        <div v-if="currentRow.status === 2" class="reject-reason">
          <el-alert type="error" :title="`驳回原因：${currentRow.rejectReason}`" :closable="false" />
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回游记" width="500px">
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
  keyword: '',
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

function getImageList(images: string) {
  try {
    return JSON.parse(images || '[]');
  } catch {
    return [];
  }
}

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
    if (filters.keyword) {
      params.keyword = filters.keyword;
    }
    const res = await request.get('/admin/community/posts', { params });
    list.value = res.list || [];
    pagination.total = res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function handleAudit(row: any, pass: boolean) {
  if (pass) {
    try {
      await ElMessageBox.confirm('确认通过该游记审核？', '审核通过', { type: 'warning' });
      await request.post(`/admin/community/posts/${row.id}/audit`, { pass: true });
      ElMessage.success('审核通过');
      loadData();
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '操作失败');
      }
    }
  } else {
    currentRow.value = row;
    rejectForm.reason = '';
    rejectVisible.value = true;
  }
}

async function confirmReject() {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入驳回原因');
    return;
  }
  try {
    await request.post(`/admin/community/posts/${currentRow.value.id}/audit`, {
      pass: false,
      reason: rejectForm.reason,
    });
    ElMessage.success('已驳回');
    rejectVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  }
}

async function handleToggleHot(row: any) {
  try {
    const action = row.isHot === 1 ? '取消精选' : '设为精选';
    await ElMessageBox.confirm(`确认${action}该游记？`, '提示', { type: 'warning' });
    await request.post(`/admin/community/posts/${row.id}/toggle-hot`);
    ElMessage.success(action + '成功');
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确认删除该游记？删除后无法恢复。', '删除游记', {
      type: 'error',
      confirmButtonText: '确认删除',
    });
    await request.post(`/admin/community/posts/${row.id}/delete`);
    ElMessage.success('删除成功');
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
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
.posts-page {
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

.post-detail h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #303133;
}

.post-meta {
  color: #909399;
  font-size: 14px;
  margin-bottom: 16px;
}

.post-images {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.post-content {
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  margin-bottom: 16px;
}

.reject-reason {
  margin-top: 16px;
}
</style>
