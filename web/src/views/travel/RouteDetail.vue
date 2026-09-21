<template>
  <div>
    <TopNav />
    <div class="page" v-if="routeData.id">
      <div class="top">
        <img :src="routeData.mainImage" class="main-img" />
        <div class="info">
          <h2>{{ routeData.title }}</h2>
          <div class="line">{{ routeData.departFrom }} 出发 · 目的地 {{ routeData.dest }} · {{ routeData.days }} 天</div>
          <div class="line">住宿标准：{{ routeData.hotelStandard }} · 用餐标准：{{ routeData.mealStandard }}</div>
          <div class="tags">
            <el-tag v-for="t in splitTags(routeData.themes)" :key="t" size="small" class="tag">{{ t }}</el-tag>
          </div>
          <div class="price-row">
            <span class="price">¥{{ routeData.price }}/人</span>
            <span class="sales">已售 {{ routeData.sales }}</span>
          </div>
          <div class="line">费用包含：{{ routeData.included }}</div>
          <div class="line notice">注意事项：{{ routeData.notice }}</div>
        </div>
      </div>

      <el-divider content-position="left">行程安排</el-divider>
      <el-timeline>
        <el-timeline-item v-for="it in routeData.itineraries" :key="it.id" :timestamp="`第 ${it.dayNo} 天`" placement="top">
          <el-card>
            <div>{{ it.description }}</div>
            <div class="it-line" v-if="it.scenic">景点：{{ it.scenic }}</div>
            <div class="it-line" v-if="it.meal">用餐：{{ it.meal }}</div>
            <div class="it-line" v-if="it.hotel">住宿：{{ it.hotel }}</div>
            <div class="it-line" v-if="it.transport">交通：{{ it.transport }}</div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 购买 -->
      <el-divider content-position="left">预订出发</el-divider>
      <el-form :model="form" label-width="90px" class="book-form">
        <el-form-item label="出发日期">
          <el-date-picker
            v-model="form.useDate"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="disableBeforeTomorrow"
          />
        </el-form-item>
        <el-form-item label="出行人数">
          <el-input-number v-model="form.quantity" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="游客姓名">
          <el-input v-model="form.visitors" placeholder="逗号分隔，选填" class="input" />
        </el-form-item>
        <el-form-item>
          <div class="total">合计：<span class="red">¥{{ (Number(routeData.price) * form.quantity).toFixed(2) }}</span></div>
          <el-button type="primary" :loading="buying" @click="submitBuy">提交订单</el-button>
        </el-form-item>
      </el-form>
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
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const routeData = ref<any>({});
const buying = ref(false);
const form = reactive({
  useDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
  quantity: 1,
  visitors: '',
});

function splitTags(tags: string) {
  return tags ? tags.split(',').filter(t => t) : [];
}

function disableBeforeTomorrow(d: Date) {
  return dayjs(d).isBefore(dayjs().add(1, 'day'), 'day');
}

async function load() {
  try {
    routeData.value = await request.get(`/travel/routes/${route.params.id}`);
  } catch {
    // 已提示
  }
}

async function submitBuy() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录');
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  if (!form.useDate) {
    ElMessage.warning('请选择出发日期');
    return;
  }
  const names = form.visitors
    ? form.visitors.split(/[,，]/).map(s => s.trim()).filter(s => s)
    : [];
  buying.value = true;
  try {
    const order: any = await request.post('/travel/routes/buy', {
      routeId: routeData.value.id,
      useDate: form.useDate,
      quantity: form.quantity,
      visitors: JSON.stringify(names),
    });
    router.push(`/pay/${order.id}`);
  } catch {
    // 已提示
  } finally {
    buying.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}
.top {
  display: flex;
  gap: 24px;
}
.main-img {
  width: 400px;
  height: 280px;
  object-fit: cover;
  border-radius: 8px;
}
.info {
  flex: 1;
}
.line {
  margin-top: 10px;
  color: #555;
}
.notice {
  color: #999;
  font-size: 13px;
}
.tags {
  margin-top: 10px;
}
.tag {
  margin-right: 6px;
}
.price-row {
  margin-top: 14px;
  background: #fdf5f5;
  padding: 10px 14px;
  border-radius: 6px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.price {
  color: #c0392b;
  font-size: 24px;
  font-weight: bold;
}
.sales {
  color: #666;
}
.it-line {
  margin-top: 4px;
  color: #666;
  font-size: 13px;
}
.book-form {
  max-width: 560px;
}
.input {
  width: 260px;
}
.total {
  margin-bottom: 10px;
}
.red {
  color: #c0392b;
  font-size: 20px;
  font-weight: bold;
}
</style>
