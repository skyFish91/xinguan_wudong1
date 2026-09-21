<template>
  <div class="top-nav">
    <div class="nav-inner">
      <router-link to="/" class="logo">乌东文旅</router-link>
      <el-menu mode="horizontal" :default-active="activePath" class="nav-menu" :ellipsis="false">
        <el-menu-item index="/" @click="router.push('/')">首页</el-menu-item>
        <el-menu-item index="/clothing" @click="router.push('/clothing')">非遗好物</el-menu-item>
        <el-menu-item index="/food" @click="router.push('/food')">苗乡美食</el-menu-item>
        <el-menu-item index="/hotel" @click="router.push('/hotel')">民宿住宿</el-menu-item>
        <el-menu-item index="/travel" @click="router.push('/travel')">景区出行</el-menu-item>
        <el-menu-item index="/community" @click="router.push('/community')">社区分享</el-menu-item>
      </el-menu>
      <div class="nav-right">
        <template v-if="userStore.isLogin">
          <router-link v-if="isAdmin" to="/admin/dashboard" class="admin-link">管理后台</router-link>
          <router-link v-if="isMerchant" to="/merchant/dashboard" class="merchant-link">商家中心</router-link>
          <el-badge :value="cartCount" :hidden="cartCount === 0">
            <router-link to="/cart" class="icon-link">购物车</router-link>
          </el-badge>
          <router-link to="/orders" class="icon-link">我的订单</router-link>
          <el-dropdown @command="onCommand">
            <span class="user-name">{{ userStore.userInfo?.nickname || '我的' }}</span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="user">个人中心</el-dropdown-item>
                <el-dropdown-item command="etickets">我的电子票</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <router-link to="/login" class="icon-link">登录</router-link>
          <router-link to="/register" class="icon-link">注册</router-link>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import request from '../api/request';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const cartCount = ref(0);

// 判断是否是商家角色
const isMerchant = computed(() => userStore.userInfo?.role === 'merchant');

// 判断是否是管理员角色
const isAdmin = computed(() => userStore.userInfo?.role === 'admin');

// 顶部菜单高亮：取路径第一段
const activePath = computed(() => {
  const seg = '/' + route.path.split('/')[1];
  return seg === '/' || seg === '/clothing' || seg === '/food' || seg === '/hotel' || seg === '/travel' || seg === '/community'
    ? seg
    : '/';
});

async function loadCartCount() {
  if (!userStore.isLogin) return;
  try {
    const res: any = await request.get('/cart/count');
    cartCount.value = Number(res) || 0;
  } catch {
    cartCount.value = 0;
  }
}

function onCommand(cmd: string) {
  if (cmd === 'logout') {
    userStore.logout();
    router.push('/');
  } else if (cmd === 'user') {
    router.push('/user');
  } else if (cmd === 'etickets') {
    router.push('/travel/my-etickets');
  }
}

onMounted(loadCartCount);
// 购物车变化时刷新角标
window.addEventListener('cart-changed', loadCartCount);
</script>

<style scoped>
.top-nav {
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 60px;
}
.logo {
  font-size: 22px;
  font-weight: bold;
  color: #c0392b;
  text-decoration: none;
  white-space: nowrap;
}
.nav-menu {
  flex: 1;
  border-bottom: none;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.merchant-link {
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 6px 16px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}
.merchant-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
.admin-link {
  color: #fff;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 6px 16px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}
.admin-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}
.icon-link {
  color: #333;
  text-decoration: none;
  cursor: pointer;
}
.user-name {
  cursor: pointer;
  color: #333;
}
</style>
