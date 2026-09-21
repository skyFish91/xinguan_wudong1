<template>
  <div class="login-page">
    <!-- 顶部导航 -->
    <TopNav />

    <!-- Banner -->
    <div class="banner">
      <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=200&fit=crop" alt="banner" />
    </div>

    <!-- 登录卡片 -->
    <div class="login-container">
      <div class="login-card">
        <!-- 左栏 -->
        <div class="left-panel">
          <h1 class="welcome-title">
            <div>欢迎来到</div>
            <div>乌东文旅</div>
          </h1>
          <p class="welcome-text">登录您的账户，探索苗乡山水</p>
          <p class="welcome-text">获取个性化旅游推荐</p>
          <div class="register-link">
            还没有账户？<router-link to="/register">立即注册</router-link>
          </div>
        </div>

        <!-- 右栏 -->
        <div class="right-panel">
          <div class="form-header">
            <h2 class="form-title">用户登录</h2>
            <div class="title-divider"></div>
          </div>

          <el-form :model="form" class="login-form" @keyup.enter="onLogin">
            <el-form-item label="手机号">
              <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
            </el-form-item>
            <div class="form-row">
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
              <a href="#" class="forgot-link">忘记密码？</a>
            </div>
            <el-button type="primary" class="login-btn" :loading="loading" @click="onLogin">登录</el-button>
          </el-form>

          <div class="bottom-link">
            还没有账户？<router-link to="/register">立即注册</router-link>
          </div>

          <div class="demo-tips">
            <div class="tips-title">演示账号</div>
            <div class="tips-item">游客 13800000001 / user123</div>
            <div class="tips-item">商家 13800000002 / merchant123</div>
            <div class="tips-item">管理员 13800000000 / admin123</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="page-footer">
      <p>© 乌东文旅 版权所有</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../api/request';
import { useUserStore } from '../stores/user';
import TopNav from '../components/TopNav.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const form = reactive({ phone: '', password: '' });
const loading = ref(false);
const rememberMe = ref(false);

async function onLogin() {
  if (!form.phone || !form.password) {
    ElMessage.warning('请输入手机号和密码');
    return;
  }
  loading.value = true;
  try {
    const res: any = await request.post('/auth/login', form);
    userStore.setLogin(res.accessToken, null);
    // 拉取用户信息
    try {
      const profile: any = await request.get('/auth/profile');
      userStore.setUserInfo(profile);
    } catch {
      // 信息拉取失败不影响登录
    }
    ElMessage.success('登录成功');
    router.push((route.query.redirect as string) || '/');
  } catch {
    // 错误已提示
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #FAFAF8;
  display: flex;
  flex-direction: column;
}

/* Banner */
.banner {
  height: 400px;
  overflow: hidden;
}
.banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 登录容器 */
.login-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
}
.login-card {
  width: 900px;
  display: flex;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* 左栏 */
.left-panel {
  width: 40%;
  background: #D4A017;
  padding: 80px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  color: #fff;
}
.left-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="rgba(255,255,255,0.03)" width="100" height="100"/></svg>');
  opacity: 0.3;
}
.welcome-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 32px 0;
  position: relative;
  z-index: 1;
  line-height: 1.3;
  letter-spacing: 1px;
  text-align: center;
}
.welcome-title div:last-child {
  font-size: 48px;
  margin-top: 8px;
}
.welcome-text {
  font-size: 17px;
  line-height: 1.6;
  margin: 0 0 12px 0;
  opacity: 0.92;
  position: relative;
  z-index: 1;
  font-weight: 300;
}
.register-link {
  margin-top: 60px;
  font-size: 15px;
  position: relative;
  z-index: 1;
  opacity: 0.9;
}
.register-link a {
  color: #fff;
  font-weight: 500;
  text-decoration: none;
  margin-left: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  transition: border-color 0.3s;
}
.register-link a:hover {
  border-bottom-color: #fff;
}

/* 右栏 */
.right-panel {
  width: 60%;
  padding: 60px 50px;
}
.form-header {
  text-align: center;
  margin-bottom: 40px;
}
.form-title {
  font-size: 24px;
  font-weight: 600;
  color: #D4A017;
  margin: 0 0 12px 0;
}
.title-divider {
  width: 60px;
  height: 3px;
  background: #D4A017;
  margin: 0 auto;
  border-radius: 2px;
}
.login-form {
  margin-bottom: 24px;
}
.login-form :deep(.el-form-item__label) {
  display: block;
  text-align: left;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}
.login-form :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e0e0e0 inset;
}
.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #D4A017 inset;
}
.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.forgot-link {
  color: #D4A017;
  text-decoration: none;
  font-size: 14px;
}
.forgot-link:hover {
  text-decoration: underline;
}
.login-btn {
  width: 100%;
  height: 44px;
  background: #D4A017;
  border-color: #D4A017;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
}
.login-btn:hover {
  background: #C09015;
  border-color: #C09015;
}
.bottom-link {
  text-align: center;
  font-size: 14px;
  color: #333;
  margin-bottom: 32px;
  line-height: 1.6;
}
.bottom-link a {
  color: #D4A017;
  text-decoration: none;
  margin-left: 8px;
}
.bottom-link a:hover {
  text-decoration: underline;
}
.demo-tips {
  background: #FFF9E6;
  border-radius: 12px;
  padding: 16px;
  font-size: 12px;
  line-height: 1.6;
  color: #333;
}
.tips-title {
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 8px;
}
.tips-item {
  margin-bottom: 4px;
}

/* 页脚 */
.page-footer {
  background: #2c3e50;
  color: #fff;
  text-align: center;
  padding: 24px;
  font-size: 14px;
}
.page-footer p {
  margin: 0;
}
</style>
