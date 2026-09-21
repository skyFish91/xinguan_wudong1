<template>
  <div class="products-page">
    <div class="page-header">
      <h2 class="page-title">商品管理</h2>
      <el-button type="primary" @click="showDialog('add')">新增商品</el-button>
    </div>

    <!-- 筛选工具栏 -->
    <el-card class="toolbar">
      <el-input v-model="keyword" placeholder="搜索商品名称" style="width: 300px" clearable @keyup.enter="load(1)" />
      <el-select v-model="status" placeholder="状态" style="width: 120px; margin-left: 12px" clearable @change="load(1)">
        <el-option label="上架" value="1" />
        <el-option label="下架" value="0" />
      </el-select>
      <el-button type="primary" @click="load(1)" style="margin-left: 12px">搜索</el-button>
    </el-card>

    <!-- 商品列表 -->
    <el-card>
      <el-table :data="list" v-loading="loading">
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <img :src="row.mainImage" class="product-img" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="商品名称" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="showDialog('edit', row)">编辑</el-button>
            <el-button text type="warning" @click="toggleStatus(row)">
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button text type="danger" @click="deleteProduct(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        layout="prev, pager, next"
        style="margin-top: 16px; text-align: center"
        @current-change="load"
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'add' ? '新增商品' : '编辑商品'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="商品名称">
          <el-input v-model="form.title" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" placeholder="请输入副标题" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="市场价">
          <el-input-number v-model="form.marketPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="form.stock" :min="0" />
        </el-form-item>
        <el-form-item label="工艺介绍">
          <el-input v-model="form.craft" type="textarea" :rows="3" placeholder="请输入工艺介绍" />
        </el-form-item>
        <el-form-item label="商品详情">
          <el-input v-model="form.detail" type="textarea" :rows="4" placeholder="请输入商品详情" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

const keyword = ref('');
const status = ref('');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);

const dialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const form = reactive({
  id: 0,
  title: '',
  subtitle: '',
  categoryId: null,
  price: 0,
  marketPrice: 0,
  stock: 0,
  craft: '',
  detail: '',
});

const categories = ref<any[]>([]);

async function load(p = 1) {
  page.value = p;
  loading.value = true;
  try {
    const res: any = await request.get('/merchant/products', {
      params: { page: p, pageSize, keyword: keyword.value, status: status.value },
    });
    list.value = res.list || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  try {
    const res: any = await request.get('/clothing/categories');
    categories.value = res || [];
  } catch {
    // 错误已处理
  }
}

function showDialog(mode: 'add' | 'edit', row?: any) {
  dialogMode.value = mode;
  if (mode === 'add') {
    Object.assign(form, {
      id: 0,
      title: '',
      subtitle: '',
      categoryId: null,
      price: 0,
      marketPrice: 0,
      stock: 0,
      craft: '',
      detail: '',
    });
  } else {
    Object.assign(form, row);
  }
  dialogVisible.value = true;
}

async function saveProduct() {
  try {
    if (dialogMode.value === 'add') {
      await request.post('/merchant/products', form);
      ElMessage.success('新增成功');
    } else {
      await request.put(`/merchant/products/${form.id}`, form);
      ElMessage.success('保存成功');
    }
    dialogVisible.value = false;
    load(page.value);
  } catch {
    // 错误已处理
  }
}

async function toggleStatus(row: any) {
  try {
    await request.put(`/merchant/products/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
    ElMessage.success('操作成功');
    load(page.value);
  } catch {
    // 错误已处理
  }
}

async function deleteProduct(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该商品吗？', '提示', { type: 'warning' });
    await request.delete(`/merchant/products/${row.id}`);
    ElMessage.success('删除成功');
    load(page.value);
  } catch (err: any) {
    if (err !== 'cancel') {
      // 错误已处理
    }
  }
}

onMounted(() => {
  load();
  loadCategories();
});
</script>

<style scoped>
.products-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.toolbar {
  margin-bottom: 16px;
}

.toolbar :deep(.el-card__body) {
  display: flex;
  align-items: center;
}

.product-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
