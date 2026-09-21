<template>
  <div class="users-page">
    <h2 class="page-title">用户管理</h2>

    <!-- 搜索筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="手机号/昵称"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" clearable placeholder="全部" style="width: 120px">
            <el-option label="普通用户" value="user" />
            <el-option label="商家" value="merchant" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部" style="width: 120px">
            <el-option label="正常" :value="1" />
            <el-option label="封禁" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card style="margin-top: 16px">
      <el-table :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" type="danger">管理员</el-tag>
            <el-tag v-else-if="row.role === 'merchant'" type="warning">商家</el-tag>
            <el-tag v-else type="info">普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">正常</el-tag>
            <el-tag v-else type="danger">封禁</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.role !== 'admin'"
              :type="row.status === 1 ? 'danger' : 'success'"
              size="small"
              link
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '封禁' : '解封' }}
            </el-button>
            <el-button
              v-if="row.role !== 'admin'"
              type="warning"
              size="small"
              link
              @click="resetPassword(row)"
            >
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import dayjs from 'dayjs';

const searchForm = reactive({
  keyword: '',
  role: '',
  status: undefined as number | undefined,
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const list = ref<any[]>([]);

async function loadData() {
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      role: searchForm.role || undefined,
      status: searchForm.status,
    };
    const res: any = await request.get('/admin/users', { params });
    list.value = res.list || [];
    pagination.total = res.total || 0;
  } catch {
    // 错误已处理
  }
}

function resetSearch() {
  searchForm.keyword = '';
  searchForm.role = '';
  searchForm.status = undefined;
  pagination.page = 1;
  loadData();
}

async function toggleStatus(row: any) {
  const action = row.status === 1 ? '封禁' : '解封';
  try {
    await ElMessageBox.confirm(`确认${action}该用户？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await request.patch(`/admin/users/${row.id}/status`, {
      status: row.status === 1 ? 0 : 1,
    });

    ElMessage.success(`${action}成功`);
    loadData();
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已处理
    }
  }
}

async function resetPassword(row: any) {
  try {
    await ElMessageBox.confirm(
      '确认重置该用户密码？密码将重置为：123456',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await request.post(`/admin/users/${row.id}/reset-password`);
    ElMessage.success('密码重置成功，新密码：123456');
  } catch (err) {
    if (err !== 'cancel') {
      // 错误已处理
    }
  }
}

function formatTime(time: string) {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
}

onMounted(loadData);
</script>

<style scoped>
.users-page {
  padding: 0;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.filter-card {
  background: #fff;
}

.filter-card :deep(.el-card__body) {
  padding: 16px;
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
