<template>
  <div class="merchant-layout">
    <TopNav />
    <div class="layout-container">
      <!-- 左侧菜单 -->
      <el-aside width="240px" class="sidebar">
        <div class="merchant-info">
          <div class="merchant-avatar">🏪</div>
          <div class="merchant-name">{{ merchantName }}</div>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          class="sidebar-menu"
        >
          <el-menu-item index="/merchant/dashboard">
            <el-icon><DataLine /></el-icon>
            <span>数据概览</span>
          </el-menu-item>
          <el-menu-item v-if="showProducts" index="/merchant/products">
            <el-icon><Goods /></el-icon>
            <span>商品管理</span>
          </el-menu-item>
          <el-menu-item index="/merchant/orders">
            <el-icon><ShoppingBag /></el-icon>
            <span>订单管理</span>
          </el-menu-item>
          <el-menu-item v-if="showHomestays" index="/merchant/homestays">
            <el-icon><House /></el-icon>
            <span>民宿管理</span>
          </el-menu-item>
          <el-menu-item v-if="showRestaurants" index="/merchant/restaurants">
            <el-icon><Food /></el-icon>
            <span>餐厅管理</span>
          </el-menu-item>
          <el-menu-item v-if="showScenics" index="/merchant/scenics">
            <el-icon><Ticket /></el-icon>
            <span>景区票务</span>
          </el-menu-item>
          <el-menu-item index="/merchant/statistics">
            <el-icon><TrendCharts /></el-icon>
            <span>数据统计</span>
          </el-menu-item>
          <el-menu-item index="/merchant/settings">
            <el-icon><Setting /></el-icon>
            <span>店铺设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 右侧内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { DataLine, Goods, ShoppingBag, House, Food, Ticket, TrendCharts, Setting } from '@element-plus/icons-vue';
import TopNav from '../../components/TopNav.vue';
import { useUserStore } from '../../stores/user';
import request from '../../api/request';

const route = useRoute();
const userStore = useUserStore();

const merchantName = computed(() => userStore.userInfo?.nickname || '商家中心');
const activeMenu = computed(() => route.path);

const moduleType = ref<string>('');

// 根据 module_type 判断是否显示某个菜单项
const showProducts = computed(() => moduleType.value === 'clothing');
const showHomestays = computed(() => moduleType.value === 'hotel');
const showRestaurants = computed(() => moduleType.value === 'food');
const showScenics = computed(() => moduleType.value === 'travel');

onMounted(async () => {
  // 检查商家权限
  if (!userStore.isLogin || userStore.userInfo?.role !== 'merchant') {
    window.location.href = '/login';
    return;
  }

  // 获取商家信息，包括 module_type
  try {
    const profile: any = await request.get('/auth/profile');
    moduleType.value = profile.merchantType || '';
  } catch {
    // 获取失败，默认不显示特定模块菜单
  }
});
</script>

<style scoped>
.merchant-layout {
  min-height: 100vh;
  background: #FAFAF8;
}

.layout-container {
  display: flex;
  max-width: 1600px;
  margin: 0 auto;
}

.sidebar {
  background: white;
  min-height: calc(100vh - 60px);
  border-right: 1px solid #e4e7ed;
}

.merchant-info {
  padding: 24px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 12px;
}

.merchant-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #D4A017;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.merchant-name {
  font-size: 16px;
  font-weight: 600;
  color: #2C2C2C;
}

.sidebar-menu {
  border: none;
}

.sidebar-menu .el-menu-item {
  height: 48px;
  line-height: 48px;
}

.main-content {
  background: #FAFAF8;
  padding: 0;
}
</style>
