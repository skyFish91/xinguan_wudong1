<template>
  <div class="products-page">
    <h2 class="page-title">商品管理</h2>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="商品类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 150px" @change="loadData">
            <el-option label="非遗商品" value="product" />
            <el-option label="菜品" value="dish" />
            <el-option label="民宿" value="homestay" />
            <el-option label="景区" value="scenic" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="商品名称"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="已下架" :value="0" />
            <el-option label="已上架" :value="1" />
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
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.productType === 'product'" type="primary">非遗商品</el-tag>
            <el-tag v-else-if="row.productType === 'dish'" type="warning">菜品</el-tag>
            <el-tag v-else-if="row.productType === 'homestay'" type="success">民宿</el-tag>
            <el-tag v-else-if="row.productType === 'scenic'" type="info">景区</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            {{ row.title || row.name }}
          </template>
        </el-table-column>
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.mainImage"
              :src="row.mainImage"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-src-list="[row.mainImage]"
            />
          </template>
        </el-table-column>
        <el-table-column label="价格" width="120">
          <template #default="{ row }">
            <span v-if="row.price">¥{{ row.price }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="库存/销量" width="120">
          <template #default="{ row }">
            <div v-if="row.stock !== undefined" style="font-size: 12px">
              <div>库存: {{ row.stock }}</div>
              <div style="color: #909399">销量: {{ row.sales || 0 }}</div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="100">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled show-score text-color="#ff9900" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="danger">已下架</el-tag>
            <el-tag v-else type="success">已上架</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
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
              {{ row.status === 0 ? '上架' : '下架' }}
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
  type: '',
  keyword: '',
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
    if (filters.type) {
      params.type = filters.type;
    }
    if (filters.keyword) {
      params.keyword = filters.keyword;
    }
    if (filters.status !== undefined) {
      params.status = filters.status;
    }
    const res = await request.get('/admin/products', { params });
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
    const action = row.status === 0 ? '上架' : '下架';
    const newStatus = row.status === 0 ? 1 : 0;
    await ElMessageBox.confirm(`确认${action}该商品？`, '提示', { type: 'warning' });
    await request.post(`/admin/products/${row.productType}/${row.id}/status`, {
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
.products-page {
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
