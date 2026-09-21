<template>
  <div class="layout">
    <aside class="side">
      <div class="logo">乌东文旅 · 管理后台</div>
      <el-menu :default-active="route.path" router class="menu">
        <el-menu-item index="/">
          <el-icon><DataLine /></el-icon>仪表盘
        </el-menu-item>

        <template v-if="userStore.role === 'admin'">
          <el-menu-item index="/users"><el-icon><User /></el-icon>用户管理</el-menu-item>
          <el-menu-item index="/applies"><el-icon><Shop /></el-icon>商家审核</el-menu-item>
          <el-menu-item index="/orders"><el-icon><List /></el-icon>订单总览</el-menu-item>
          <el-menu-item index="/refunds"><el-icon><Money /></el-icon>退款审批</el-menu-item>
          <el-menu-item index="/content"><el-icon><ChatLineSquare /></el-icon>内容审核</el-menu-item>
          <el-menu-item index="/sensitive"><el-icon><Warning /></el-icon>敏感词管理</el-menu-item>
          <el-menu-item index="/ops"><el-icon><Picture /></el-icon>运营管理</el-menu-item>
          <el-menu-item index="/finance"><el-icon><Coin /></el-icon>财务管理</el-menu-item>
        </template>

        <template v-if="userStore.role === 'merchant'">
          <el-menu-item v-if="userStore.moduleType === 'clothing'" index="/merchant/clothing">
            <el-icon><Goods /></el-icon>商品管理
          </el-menu-item>
          <el-menu-item v-if="userStore.moduleType === 'food'" index="/merchant/food">
            <el-icon><Food /></el-icon>餐厅管理
          </el-menu-item>
          <el-menu-item v-if="userStore.moduleType === 'hotel'" index="/merchant/hotel">
            <el-icon><House /></el-icon>民宿管理
          </el-menu-item>
          <el-menu-item v-if="userStore.moduleType === 'travel'" index="/merchant/travel">
            <el-icon><Position /></el-icon>票务管理
          </el-menu-item>
        </template>
      </el-menu>
    </aside>
    <div class="main">
      <header class="head">
        <div class="head-title">
          <el-tag v-if="userStore.role === 'admin'" type="danger">平台管理员</el-tag>
          <el-tag v-else type="warning">{{ userStore.userInfo?.merchant?.shopName || '商家' }}</el-tag>
          <span class="nickname">{{ userStore.userInfo?.nickname }}</span>
        </div>
        <el-dropdown @command="onCommand">
          <span class="user-btn">{{ userStore.userInfo?.nickname || '用户' }}<el-icon><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '../api/request';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

function onCommand(cmd: string) {
  if (cmd === 'logout') {
    userStore.logout();
    router.push('/login');
  }
}

onMounted(async () => {
  // 刷新资料（角色/模块信息）
  try {
    const profile: any = await request.get('/auth/profile');
    userStore.setLogin(userStore.token, profile);
  } catch {
    // 已提示
  }
});
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}
.side {
  width: 220px;
  background: #2b3a4a;
  flex-shrink: 0;
}
.logo {
  color: #fff;
  font-weight: bold;
  padding: 18px 16px;
  font-size: 15px;
}
.menu {
  background: transparent;
  border-right: none;
}
.menu :deep(.el-menu-item) {
  color: #cfd8e3;
}
.menu :deep(.el-menu-item.is-active) {
  background: #c0392b;
  color: #fff;
}
.menu :deep(.el-menu-item:hover) {
  background: #3a4c5f;
  color: #fff;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.head {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.head-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nickname {
  color: #666;
}
.user-btn {
  cursor: pointer;
  color: #333;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.content {
  flex: 1;
  background: #f5f6f8;
  padding: 20px;
  overflow: auto;
}
</style>
