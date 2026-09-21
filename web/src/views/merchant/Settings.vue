<template>
  <div class="settings-page">
    <h2 class="page-title">店铺设置</h2>

    <el-card>
      <el-form :model="form" label-width="120px">
        <el-form-item label="店铺名称">
          <el-input v-model="form.name" style="width: 400px" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" style="width: 400px" />
        </el-form-item>
        <el-form-item label="店铺简介">
          <el-input v-model="form.intro" type="textarea" :rows="4" style="width: 400px" />
        </el-form-item>
        <el-form-item label="营业状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">营业中</el-radio>
            <el-radio :value="0">休息中</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="save">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

const form = reactive({
  name: '',
  phone: '',
  intro: '',
  status: 1,
});

async function load() {
  try {
    const res: any = await request.get('/merchant/settings');
    Object.assign(form, res);
  } catch {
    // 错误已处理
  }
}

async function save() {
  try {
    await request.put('/merchant/settings', form);
    ElMessage.success('保存成功');
  } catch {
    // 错误已处理
  }
}

onMounted(load);
</script>

<style scoped>
.settings-page {
  padding: 24px;
}

.page-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}
</style>
