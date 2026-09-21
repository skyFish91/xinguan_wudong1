<template>
  <div class="restaurants-page">
    <div class="page-header">
      <h2 class="page-title">餐厅管理</h2>
      <el-button type="primary" @click="showDialog('add')">新增餐厅</el-button>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading">
        <el-table-column label="餐厅图片" width="100">
          <template #default="{ row }">
            <img :src="row.mainImage" class="item-img" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="餐厅名称" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="businessHours" label="营业时间" width="150" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="showDialog('edit', row)">编辑</el-button>
            <el-button text type="primary" @click="manageDishes(row)">菜品管理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'add' ? '新增餐厅' : '编辑餐厅'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="餐厅名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="营业时间">
          <el-input v-model="form.businessHours" placeholder="如：10:00-22:00" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

const router = useRouter();
const list = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const form = reactive({ id: 0, name: '', address: '', businessHours: '', intro: '' });

async function load() {
  loading.value = true;
  try {
    const res: any = await request.get('/merchant/restaurants');
    list.value = res.list || [];
  } finally {
    loading.value = false;
  }
}

function showDialog(mode: 'add' | 'edit', row?: any) {
  dialogMode.value = mode;
  if (mode === 'add') {
    Object.assign(form, { id: 0, name: '', address: '', businessHours: '', intro: '' });
  } else {
    Object.assign(form, row);
  }
  dialogVisible.value = true;
}

async function save() {
  try {
    if (dialogMode.value === 'add') {
      await request.post('/merchant/restaurants', form);
    } else {
      await request.put(`/merchant/restaurants/${form.id}`, form);
    }
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    load();
  } catch {
    // 错误已处理
  }
}

function manageDishes(row: any) {
  router.push(`/merchant/restaurants/${row.id}/dishes`);
}

onMounted(load);
</script>

<style scoped>
.restaurants-page {
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

.item-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
