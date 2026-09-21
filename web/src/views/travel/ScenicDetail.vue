<template>
  <div>
    <TopNav />

    <div v-if="loading" class="loading-wrapper">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>

    <div v-else-if="scenic" class="page">
      <!-- 头部大图 banner -->
      <div class="hero-image" :style="{ backgroundImage: `url(${scenic.mainImage})` }">
        <div class="hero-overlay">
          <div class="hero-content">
            <h1 class="scenic-name">{{ scenic.name }}</h1>
            <div class="hero-info">
              <div class="info-item">
                <el-icon><Location /></el-icon>
                <span>{{ scenic.address }}</span>
              </div>
              <div class="info-item">
                <el-icon><Clock /></el-icon>
                <span>{{ scenic.openTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主内容区：左右分栏 -->
      <div class="main-container">
        <!-- 左侧信息栏 -->
        <aside class="sidebar">
          <!-- 票种购买卡片 -->
          <div class="booking-card">
            <h3 class="card-title">门票预订</h3>
            <div v-for="t in scenic.tickets" :key="t.id" class="ticket-item">
              <div class="ticket-header">
                <div class="ticket-name">{{ t.name }}</div>
                <div class="ticket-price">¥<span>{{ t.price }}</span></div>
              </div>
              <div class="ticket-meta">
                <span class="ticket-valid">{{ t.validRule }}</span>
                <span v-if="stocks[t.id] !== undefined" class="ticket-stock">余票 {{ stocks[t.id] }}</span>
              </div>
              <div v-if="buyForm[t.id]" class="ticket-form">
                <el-form-item label="游玩日期">
                  <el-date-picker
                    v-model="buyForm[t.id].useDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :disabled-date="disablePast"
                    placeholder="选择日期"
                    size="default"
                    style="width: 100%;"
                  />
                </el-form-item>
                <el-form-item label="购买数量">
                  <el-input-number
                    v-model="buyForm[t.id].quantity"
                    :min="1"
                    :max="10"
                    size="default"
                    style="width: 100%;"
                  />
                </el-form-item>
                <el-form-item label="游客姓名" required>
                  <el-input
                    v-model="buyForm[t.id].visitors"
                    placeholder="必填，多人用逗号分隔"
                    size="default"
                  />
                </el-form-item>
                <el-button
                  type="primary"
                  size="large"
                  class="buy-button"
                  :disabled="!buyForm[t.id].visitors || !buyForm[t.id].visitors.trim()"
                  @click="buyTicket(t)"
                >
                  {{ !buyForm[t.id].visitors || !buyForm[t.id].visitors.trim() ? '请填写游客姓名' : '立即购买' }}
                </el-button>
              </div>
            </div>
          </div>

          <!-- 景区信息卡片 -->
          <div class="info-card">
            <h4 class="info-title">景区信息</h4>
            <div class="info-list">
              <div class="info-row">
                <el-icon class="info-icon"><Location /></el-icon>
                <div class="info-content">
                  <div class="info-label">地址</div>
                  <div class="info-value">{{ scenic.address }}</div>
                </div>
              </div>
              <div class="info-row">
                <el-icon class="info-icon"><Clock /></el-icon>
                <div class="info-content">
                  <div class="info-label">开放时间</div>
                  <div class="info-value">{{ scenic.openTime }}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右侧主内容区 -->
        <main class="main-content">
          <div class="intro-section">
            <h2 class="section-title">景区介绍</h2>
            <p class="section-subtitle">{{ scenic.intro }}</p>
          </div>

          <!-- 详细内容 - 时间轴样式 -->
          <div v-if="scenic.detail" class="timeline-section">
            <div v-html="scenic.detail" class="timeline-content"></div>
          </div>
        </main>
      </div>
    </div>

    <el-empty v-else description="景区不存在" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Location, Clock, Loading } from '@element-plus/icons-vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';
import { useUserStore } from '../../stores/user';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const scenic = ref<any>(null);
const loading = ref(true);
const stocks = reactive<Record<number, number>>({});
const buyForm = reactive<Record<number, { useDate: string; quantity: number; visitors: string }>>({});

function disablePast(d: Date) {
  return dayjs(d).isBefore(dayjs(), 'day');
}

async function loadStocks(tickets: any[]) {
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  for (const t of tickets) {
    buyForm[t.id] = { useDate: tomorrow, quantity: 1, visitors: '' };
  }
  for (const t of tickets) {
    try {
      const s: any = await request.get('/travel/tickets/stock', {
        params: { ticketTypeId: t.id, useDate: buyForm[t.id].useDate },
      });
      stocks[t.id] = s.remain;
    } catch {
      // 已提示
    }
  }
}

async function buyTicket(ticket: any) {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  const f = buyForm[ticket.id];
  if (!f.useDate) {
    ElMessage.warning('请选择使用日期');
    return;
  }
  if (!f.visitors || !f.visitors.trim()) {
    ElMessage.warning('请填写游客姓名');
    return;
  }
  if (stocks[ticket.id] !== undefined && stocks[ticket.id] < f.quantity) {
    ElMessage.warning('当日余票不足');
    return;
  }
  const names = f.visitors
    .split(/[,，]/).map(s => s.trim()).filter(s => s);
  try {
    const order: any = await request.post('/travel/tickets/buy', {
      ticketTypeId: ticket.id,
      useDate: f.useDate,
      quantity: f.quantity,
      visitors: JSON.stringify(names),
    });
    router.push(`/pay/${order.id}`);
  } catch {
    // 已提示
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const scenics: any[] = await request.get('/travel/scenics');
    const id = Number(route.params.id);
    scenic.value = scenics.find((s: any) => s.id === id);
    if (scenic.value && scenic.value.tickets) {
      await loadStocks(scenic.value.tickets);
    }
  } catch {
    // 已提示
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.loading-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page {
  background: #FAFAF8;
  min-height: 100vh;
}

/* 头部 banner */
.hero-image {
  height: 500px;
  background-size: cover;
  background-position: center;
  position: relative;
}
.hero-image::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 50%, transparent 100%);
}
.hero-overlay {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
}
.hero-content {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px 60px;
}
.scenic-name {
  color: #fff;
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 24px 0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.hero-info {
  display: flex;
  gap: 32px;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
}
.info-item .el-icon {
  font-size: 20px;
}

/* 主容器 */
.main-container {
  max-width: 1200px;
  margin: -80px auto 0;
  padding: 0 24px 60px;
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
  align-items: start;
}

/* 左侧栏 */
.sidebar {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 票种购买卡片 */
.booking-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.card-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 12px;
  border-bottom: 2px solid #D4A017;
}
.ticket-item {
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}
.ticket-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.ticket-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.ticket-price {
  font-size: 14px;
  color: #D4A017;
  font-weight: 500;
}
.ticket-price span {
  font-size: 24px;
  font-weight: 700;
}
.ticket-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #909399;
  margin-bottom: 16px;
}
.ticket-stock {
  color: #67C23A;
}
.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ticket-form :deep(.el-form-item) {
  margin-bottom: 0;
}
.ticket-form :deep(.el-form-item__label) {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 6px;
}
.buy-button {
  width: 100%;
  background: #D4A017;
  border-color: #D4A017;
  font-weight: 500;
}
.buy-button:hover {
  background: #B8860B;
  border-color: #B8860B;
}
.buy-button:disabled {
  background: #eee;
  border-color: #eee;
  color: #999;
}

/* 景区信息卡片 */
.info-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.info-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-row {
  display: flex;
  gap: 10px;
}
.info-icon {
  color: #D4A017;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}
.info-content {
  flex: 1;
}
.info-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.info-value {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* 右侧主内容 */
.main-content {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.intro-section {
  margin-bottom: 40px;
}
.section-title {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  padding-bottom: 12px;
  border-bottom: 3px solid #D4A017;
}
.section-subtitle {
  margin: 20px 0 0 0;
  font-size: 16px;
  line-height: 2;
  color: #606266;
  text-indent: 2em;
}

/* 时间轴样式 */
.timeline-section {
  position: relative;
}
.timeline-content :deep(h4) {
  position: relative;
  padding-left: 40px;
  margin: 32px 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.timeline-content :deep(h4:first-child) {
  margin-top: 0;
}
.timeline-content :deep(h4::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 12px;
  height: 12px;
  background: #D4A017;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #D4A017;
  z-index: 2;
}
.timeline-content :deep(h4::after) {
  content: '';
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: -20px;
  width: 2px;
  background: linear-gradient(to bottom, #D4A017, #e8e8e8);
}
.timeline-content :deep(h4:last-of-type::after) {
  display: none;
}
.timeline-content :deep(p) {
  padding-left: 40px;
  margin: 0 0 20px 0;
  line-height: 2;
  color: #606266;
  font-size: 15px;
  text-align: justify;
}
.timeline-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 20px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

/* 响应式 */
@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
    margin-top: 40px;
  }
  .sidebar {
    position: static;
    order: -1;
  }
  .booking-card,
  .info-card {
    max-width: 400px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .hero-image {
    height: 300px;
  }
  .scenic-name {
    font-size: 32px;
  }
  .hero-info {
    flex-direction: column;
    gap: 12px;
  }
  .main-container {
    padding: 0 16px 40px;
  }
  .main-content {
    padding: 24px 20px;
  }
  .section-title {
    font-size: 22px;
  }
  .booking-card,
  .info-card {
    max-width: 100%;
  }
}
</style>
