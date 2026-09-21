<template>
  <div class="topics-page">
    <h2 class="page-title">话题管理</h2>

    <el-card class="action-card">
      <el-button type="primary" @click="handleCreate">新建话题</el-button>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.coverImage"
              :src="row.coverImage"
              fit="cover"
              style="width: 50px; height: 50px; border-radius: 4px"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="话题名称" min-width="200" />
        <el-table-column prop="intro" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="帖子数" width="100">
          <template #default="{ row }">
            {{ row.postCount || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isRecommend === 1" type="warning">推荐</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="handleToggleRecommend(row)">
              {{ row.isRecommend === 1 ? '取消推荐' : '推荐' }}
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="话题名称">
          <el-input v-model="form.name" placeholder="请输入话题名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
            placeholder="请输入话题简介"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input v-model="form.coverImage" placeholder="请输入封面图片URL" />
        </el-form-item>
        <el-form-item label="推荐">
          <el-switch v-model="form.isRecommend" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import dayjs from 'dayjs';

const loading = ref(false);
const list = ref<any[]>([]);
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const dialogVisible = ref(false);
const isEdit = ref(false);
const form = reactive({
  id: undefined as number | undefined,
  name: '',
  intro: '',
  coverImage: '',
  isRecommend: 0,
});

const dialogTitle = computed(() => (isEdit.value ? '编辑话题' : '新建话题'));

async function loadData() {
  loading.value = true;
  try {
    const res = await request.get('/community/topics');
    list.value = res || [];
    pagination.total = res.length || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  isEdit.value = false;
  form.id = undefined;
  form.name = '';
  form.intro = '';
  form.coverImage = '';
  form.isRecommend = 0;
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  isEdit.value = true;
  form.id = row.id;
  form.name = row.name;
  form.intro = row.intro || '';
  form.coverImage = row.coverImage || '';
  form.isRecommend = row.isRecommend || 0;
  dialogVisible.value = true;
}

async function handleSave() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入话题名称');
    return;
  }
  try {
    await request.post('/admin/community/topics/save', form);
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
}

async function handleToggleRecommend(row: any) {
  try {
    await request.post('/admin/community/topics/save', {
      id: row.id,
      isRecommend: row.isRecommend === 1 ? 0 : 1,
    });
    ElMessage.success('操作成功');
    loadData();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认删除话题「${row.name}」？删除后无法恢复。`,
      '删除话题',
      {
        type: 'error',
        confirmButtonText: '确认删除',
      }
    );
    await request.post(`/admin/community/topics/${row.id}/delete`);
    ElMessage.success('删除成功');
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
.topics-page {
  padding: 0;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.action-card {
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
