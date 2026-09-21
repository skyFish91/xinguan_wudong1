<template>
  <div>
    <TopNav />

    <!-- Hero 背景区域 -->
    <div class="hero-section">
      <div class="hero-overlay">
        <h1 class="hero-title">苗乡美食</h1>
        <p class="hero-subtitle">品味地道苗家风味，尽享特色农产珍品</p>
      </div>
    </div>

    <div class="page">
      <el-tabs v-model="tab">
        <!-- 餐厅 -->
        <el-tab-pane label="苗乡餐厅 · 餐位预订" name="restaurants">
          <div class="toolbar">
            <el-input v-model="restKeyword" placeholder="搜索餐厅" class="search" clearable @keyup.enter="loadRest(1)" />
            <el-button type="primary" @click="loadRest(1)">搜索</el-button>
            <el-radio-group v-model="restSort" class="sorts" @change="loadRest(1)">
              <el-radio-button value="rating">评分优先</el-radio-button>
              <el-radio-button value="capacity">容纳人数</el-radio-button>
            </el-radio-group>
          </div>
          <div class="grid-3">
            <el-card v-for="r in restaurants" :key="r.id" shadow="hover" class="item" @click="$router.push(`/food/restaurant/${r.id}`)">
              <img :src="r.mainImage" class="item-img" />
              <div class="item-title">{{ r.name }}</div>
              <div class="item-sub">{{ r.intro }}</div>
              <div class="item-bottom">
                <span class="price">评分 {{ r.rating }}</span>
                <span class="sales">可容纳 {{ r.capacity }} 人</span>
              </div>
            </el-card>
          </div>
          <el-pagination
            v-if="restTotal > 10"
            layout="prev, pager, next"
            :total="restTotal"
            :page-size="10"
            :current-page="restPage"
            class="pager"
            @current-change="loadRest"
          />
        </el-tab-pane>

        <!-- 农产品 -->
        <el-tab-pane label="苗乡特产 · 农产品" name="farm">
          <div class="toolbar">
            <el-select v-model="farmCatId" placeholder="全部分类" clearable class="cat-select" @change="loadFarm(1)">
              <el-option v-for="c in farmCats" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="farmKeyword" placeholder="搜索特产" class="search" clearable @keyup.enter="loadFarm(1)" />
            <el-button type="primary" @click="loadFarm(1)">搜索</el-button>
          </div>
          <div class="grid-4">
            <el-card v-for="f in farmList" :key="f.id" shadow="hover" class="item" @click="showFarm(f)">
              <img :src="f.mainImage" class="item-img" />
              <div class="item-title">{{ f.name }}</div>
              <div class="item-sub">{{ f.spec }}</div>
              <div class="item-bottom">
                <span class="price">¥{{ f.price }}</span>
                <el-button size="small" type="danger" @click.stop="addFarmCart(f)">加购物车</el-button>
              </div>
            </el-card>
          </div>
          <el-pagination
            v-if="farmTotal > 12"
            layout="prev, pager, next"
            :total="farmTotal"
            :page-size="12"
            :current-page="farmPage"
            class="pager"
            @current-change="loadFarm"
          />

          <!-- 农产品详情弹窗 -->
          <el-dialog v-model="farmDialog" :title="currentFarm?.name" width="560px">
            <img :src="currentFarm?.mainImage" class="dialog-img" />
            <div class="dialog-line" v-if="currentFarm?.origin">产地溯源：{{ currentFarm.origin }}</div>
            <div class="dialog-line" v-if="currentFarm?.shelfLife">保质期：{{ currentFarm.shelfLife }}</div>
            <div class="dialog-line" v-if="currentFarm?.description">{{ currentFarm.description }}</div>
            <template #footer>
              <el-input-number v-model="farmQty" :min="1" :max="99" class="qty" />
              <el-button type="danger" @click="addFarmCart(currentFarm, true)">加入购物车</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const userStore = useUserStore();
const tab = ref('restaurants');

const restaurants = ref<any[]>([]);
const restKeyword = ref('');
const restSort = ref('rating');
const restPage = ref(1);
const restTotal = ref(0);

const farmCats = ref<any[]>([]);
const farmCatId = ref<number | undefined>(undefined);
const farmKeyword = ref('');
const farmList = ref<any[]>([]);
const farmPage = ref(1);
const farmTotal = ref(0);
const farmDialog = ref(false);
const currentFarm = ref<any>(null);
const farmQty = ref(1);

async function loadRest(p = 1) {
  restPage.value = p;
  const data: any = await request.get('/food/restaurants', {
    params: { sort: restSort.value, keyword: restKeyword.value || undefined, page: restPage.value, pageSize: 10 },
  });
  restaurants.value = data.list || [];
  restTotal.value = data.total || 0;
}

async function loadFarm(p = 1) {
  farmPage.value = p;
  const data: any = await request.get('/food/farm/products', {
    params: {
      categoryId: farmCatId.value,
      keyword: farmKeyword.value || undefined,
      sort: 'default',
      page: farmPage.value,
      pageSize: 12,
    },
  });
  farmList.value = data.list || [];
  farmTotal.value = data.total || 0;
}

async function showFarm(f: any) {
  try {
    currentFarm.value = await request.get(`/food/farm/products/${f.id}`);
    farmQty.value = 1;
    farmDialog.value = true;
  } catch {
    // 已提示
  }
}

async function addFarmCart(f: any, fromDialog = false) {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  try {
    await request.post('/cart/add', { farmProductId: f.id, quantity: fromDialog ? farmQty.value : 1 });
    ElMessage.success('已加入购物车');
    farmDialog.value = false;
    window.dispatchEvent(new Event('cart-changed'));
  } catch {
    // 已提示
  }
}

onMounted(async () => {
  loadRest();
  loadFarm();
  try {
    farmCats.value = await request.get('/food/farm/categories');
  } catch {
    // 已提示
  }
});
</script>

<style scoped>
/* Hero 区域 */
.hero-section {
  position: relative;
  height: 450px;
  background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)), url('/uploads/banner/苗乡美食.jpg');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.hero-overlay {
  text-align: center;
  color: white;
  z-index: 1;
  padding: 0 24px;
}

.hero-title {
  font-size: 72px;
  font-weight: 800;
  margin: 0 0 24px 0;
  letter-spacing: 4px;
  text-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 24px;
  margin: 0;
  opacity: 0.98;
  font-weight: 300;
  letter-spacing: 2px;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #FAFAF8;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.search {
  width: 280px;
}
.sorts {
  margin-left: auto;
}
.cat-select {
  width: 160px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.item {
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(212, 160, 23, 0.2);
  border-color: #D4A017;
}
.item-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 0;
}
.item-title {
  margin-top: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #2C2C2C;
  line-height: 1.6;
}
.item-sub {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.6;
}
.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.price {
  color: #D4A017;
  font-weight: bold;
  font-size: 18px;
}
.sales {
  font-size: 14px;
  color: #888;
}
.pager {
  margin-top: 40px;
  justify-content: center;
}
.dialog-img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 12px;
}
.dialog-line {
  line-height: 1.6;
  color: #333;
  font-size: 14px;
}
.qty {
  margin-right: 10px;
}
</style>
