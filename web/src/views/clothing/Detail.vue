<template>
  <div>
    <TopNav />
    <div class="page" v-if="product.id">
      <div class="top">
        <img :src="product.mainImage" class="main-img" />
        <div class="info">
          <h2>{{ product.title }}</h2>
          <div class="sub">{{ product.subtitle }}</div>
          <div class="price-row">
            <span class="price">¥{{ currentSku ? currentSku.price : product.price }}</span>
            <span class="market">市场价 ¥{{ product.marketPrice }}</span>
            <span class="sales">已售 {{ product.sales }} · 评分 {{ product.rating }}</span>
          </div>
          <div class="craft">{{ product.craftIntro }}</div>

          <!-- SKU 选择 -->
          <div class="sku-row" v-if="product.skus?.length">
            <div class="label">规格</div>
            <div class="sku-list">
              <el-tag
                v-for="s in product.skus"
                :key="s.id"
                :effect="currentSku?.id === s.id ? 'dark' : 'plain'"
                :type="currentSku?.id === s.id ? 'danger' : 'info'"
                class="sku-tag"
                @click="currentSku = s"
              >
                {{ s.specName }}（库存 {{ s.stock }}）
              </el-tag>
            </div>
          </div>

          <div class="qty-row">
            <div class="label">数量</div>
            <el-input-number v-model="quantity" :min="1" :max="99" />
          </div>

          <div class="actions">
            <el-button type="danger" size="large" @click="addCart">加入购物车</el-button>
            <el-button size="large" :type="favorited ? 'info' : 'default'" @click="toggleFav">
              {{ favorited ? '已收藏' : '收藏' }}
            </el-button>
          </div>

          <!-- 传承人 -->
          <div class="inheritor" v-if="product.inheritor">
            <div class="label">非遗传承人</div>
            <div class="inheritor-name">{{ product.inheritor.name }}（{{ product.inheritor.title }}）</div>
            <div class="inheritor-story">{{ product.inheritor.story }}</div>
          </div>
        </div>
      </div>

      <!-- 图文详情 -->
      <el-divider content-position="left">商品详情</el-divider>
      <div class="detail-html" v-html="product.detail" />

      <!-- 评价 -->
      <el-divider content-position="left">用户评价（{{ reviewTotal }}）</el-divider>
      <div class="review-form" v-if="userStore.isLogin">
        <el-rate v-model="reviewForm.rating" />
        <el-input v-model="reviewForm.content" type="textarea" :rows="3" placeholder="分享你的使用体验" maxlength="500" />
        <el-button type="primary" class="submit-btn" @click="submitReview">发表评价</el-button>
      </div>
      <div v-else class="review-tip">登录后可发表评价</div>

      <div v-for="r in reviews" :key="r.id" class="review-item">
        <div class="review-head">
          <span class="review-user">{{ r.userNickname || `用户${r.userId}` }}</span>
          <el-rate :model-value="r.rating" disabled size="small" />
          <span class="review-time">{{ formatTime(r.createdAt) }}</span>
        </div>
        <div class="review-content">{{ r.content }}</div>
        <div v-if="r.followUp" class="review-follow">追评：{{ r.followUp }}</div>
      </div>
      <el-empty v-if="!reviews.length" description="暂无评价" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';
import { useUserStore } from '../../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const product = ref<any>({});
const currentSku = ref<any>(null);
const quantity = ref(1);
const favorited = ref(false);
const reviews = ref<any[]>([]);
const reviewTotal = ref(0);
const reviewForm = reactive({ rating: 5, content: '' });

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

async function load() {
  try {
    product.value = await request.get(`/clothing/products/${route.params.id}`);
    if (product.value.skus?.length) {
      currentSku.value = product.value.skus[0];
    }
    const r: any = await request.get('/clothing/reviews', {
      params: { bizType: 'product', bizId: product.value.id, page: 1, pageSize: 50 },
    });
    reviews.value = r.list || [];
    reviewTotal.value = r.total || 0;
    if (userStore.isLogin) {
      const s: any = await request.get('/clothing/favorite/status', {
        params: { bizType: 'product', bizId: product.value.id },
      });
      favorited.value = !!s;
    }
  } catch {
    // 已提示
  }
}

function needLogin() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录');
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return true;
  }
  return false;
}

async function addCart() {
  if (needLogin()) return;
  if (!currentSku.value) {
    ElMessage.warning('该商品暂无可选规格');
    return;
  }
  try {
    await request.post('/cart/add', { skuId: currentSku.value.id, quantity: quantity.value });
    ElMessage.success('已加入购物车');
    window.dispatchEvent(new Event('cart-changed'));
  } catch {
    // 已提示
  }
}

async function toggleFav() {
  if (needLogin()) return;
  try {
    await request.post('/clothing/favorite/toggle', null, {
      params: { bizType: 'product', bizId: product.value.id },
    });
    favorited.value = !favorited.value;
    ElMessage.success(favorited.value ? '已收藏' : '已取消收藏');
  } catch {
    // 已提示
  }
}

async function submitReview() {
  if (!reviewForm.content.trim()) {
    ElMessage.warning('请输入评价内容');
    return;
  }
  try {
    await request.post('/clothing/reviews', {
      bizType: 'product',
      bizId: product.value.id,
      rating: reviewForm.rating,
      content: reviewForm.content,
    });
    ElMessage.success('评价成功');
    reviewForm.content = '';
    load();
  } catch {
    // 已提示
  }
}

onMounted(load);
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
  background: #FAFAF8;
  min-height: 100vh;
}

.top {
  display: flex;
  gap: 40px;
  animation: detail-enter 0.38s ease-out both;
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 32px;
}

.main-img {
  width: 480px;
  height: 420px;
  object-fit: cover;
  border-radius: 12px;
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}
.main-img:hover {
  transform: scale(1.018);
  box-shadow: 0 12px 28px rgba(212, 160, 23, 0.16);
}
.info {
  flex: 1;
}
.sub {
  color: #888;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
}
.price-row {
  margin-top: 16px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  background: #FFF9E6;
  padding: 12px;
  border-radius: 12px;
}
.price {
  color: #D4A017;
  font-size: 28px;
  font-weight: bold;
}
.market {
  color: #888;
  text-decoration: line-through;
  font-size: 14px;
}
.sales {
  color: #333;
  margin-left: auto;
  font-size: 14px;
}
.craft {
  margin-top: 12px;
  color: #333;
  line-height: 1.6;
  font-size: 14px;
}
.sku-row,
.qty-row,
.inheritor {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}
.label {
  color: #888;
  width: 80px;
  flex-shrink: 0;
  font-size: 14px;
}
.sku-tag {
  cursor: pointer;
  margin-right: 8px;
}
.actions {
  margin-top: 24px;
}
.inheritor-name {
  font-weight: 600;
}
.inheritor-story {
  color: #666;
  font-size: 13px;
  line-height: 1.6;
  margin-top: 4px;
}
.detail-html {
  line-height: 1.8;
  color: #444;
}
.review-form {
  margin-bottom: 20px;
}
.submit-btn {
  margin-top: 10px;
}
.review-tip {
  color: #999;
  margin-bottom: 12px;
}
.review-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 0;
}
.review-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.review-user {
  font-weight: 600;
}
.review-time {
  color: #999;
  font-size: 12px;
  margin-left: auto;
}
.review-content {
  margin-top: 6px;
  color: #333;
}
.review-follow {
  margin-top: 6px;
  color: #c0392b;
  font-size: 13px;
}
@keyframes detail-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .top {
    animation: none;
  }
  .main-img {
    transition: none;
  }
}
</style>
