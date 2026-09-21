<template>
  <div class="wrap">
    <div class="card">
      <h2>乌东文旅平台 · 管理后台</h2>
      <el-form :model="form" label-width="0" @keyup.enter="submit">
        <el-form-item>
          <el-input v-model="form.phone" placeholder="手机号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="btn" :loading="loading" @click="submit">登录</el-button>
        </el-form-item>
      </el-form>
      <div class="tips">
        <div>平台管理员：13800000000 / admin123</div>
        <div>衣商家：13800000002 / merchant123</div>
        <div>食商家：13800000003 / merchant123</div>
        <div>住商家：13800000004 / merchant123</div>
        <div>行商家：13800000005 / merchant123</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../api/request';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const form = reactive({ phone: '', password: '' });

async function submit() {
  if (!form.phone || !form.password) {
    ElMessage.warning('请输入账号密码');
    return;
  }
  loading.value = true;
  try {
    const data: any = await request.post('/auth/login', { phone: form.phone, password: form.password });
    userStore.setLogin(data.accessToken, data.userInfo || null);
    const profile: any = await request.get('/auth/profile');
    userStore.setLogin(userStore.token, profile);
    const redirect = String(route.query.redirect || '/');
    router.push(redirect);
  } catch {
    // 已提示
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #2b3a4a;
}
.card {
  width: 380px;
  background: #fff;
  border-radius: 10px;
  padding: 30px;
}
h2 {
  text-align: center;
  margin-bottom: 24px;
  font-size: 18px;
}
.btn {
  width: 100%;
}
.tips {
  font-size: 12px;
  color: #999;
  line-height: 1.9;
}
</style>
