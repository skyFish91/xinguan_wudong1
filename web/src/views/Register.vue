<template>
  <div class="reg-page">
    <el-card class="reg-card">
      <h2 class="title">注册账号</h2>
      <el-form :model="form" label-width="0">
        <el-form-item>
          <el-input v-model="form.phone" placeholder="手机号" maxlength="11" />
        </el-form-item>
        <el-form-item>
          <div class="code-row">
            <el-input v-model="form.smsCode" placeholder="短信验证码（测试环境填 123456）" />
            <el-button :disabled="counting > 0" @click="sendCode">{{ counting > 0 ? `${counting}s` : '获取验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.nickname" placeholder="昵称" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码（至少 6 位）" show-password />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="full" :loading="loading" @click="onRegister">注册</el-button>
        </el-form-item>
      </el-form>
      <div class="links">
        <router-link to="/login">已有账号，去登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../api/request';

const router = useRouter();
const form = reactive({ phone: '', smsCode: '', nickname: '', password: '', confirmPassword: '' });
const loading = ref(false);
const counting = ref(0);
let timer: any = null;

async function sendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  try {
    await request.post('/auth/sms-code', { phone: form.phone });
    ElMessage.success('验证码已发送（测试环境为 123456）');
    counting.value = 60;
    timer = setInterval(() => {
      counting.value -= 1;
      if (counting.value <= 0) clearInterval(timer);
    }, 1000);
  } catch {
    // 已提示
  }
}

async function onRegister() {
  if (!/^1\d{10}$/.test(form.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  if (!form.nickname) {
    ElMessage.warning('请输入昵称');
    return;
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码至少 6 位');
    return;
  }
  if (form.password !== form.confirmPassword) {
    ElMessage.warning('两次密码不一致');
    return;
  }
  loading.value = true;
  try {
    await request.post('/auth/register', {
      phone: form.phone,
      smsCode: form.smsCode,
      nickname: form.nickname,
      password: form.password,
    });
    ElMessage.success('注册成功，请登录');
    router.push('/login');
  } catch {
    // 已提示
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => clearInterval(timer));
</script>

<style scoped>
.reg-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2c3e50, #34495e);
}
.reg-card {
  width: 400px;
  padding: 20px;
}
.title {
  text-align: center;
  margin-bottom: 20px;
}
.full {
  width: 100%;
}
.code-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.links {
  font-size: 13px;
  text-align: center;
}
</style>
