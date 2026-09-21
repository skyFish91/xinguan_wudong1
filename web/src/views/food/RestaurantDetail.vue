<template>
  <div>
    <TopNav />
    <div class="page" v-if="restaurant.id">
      <div class="top">
        <img :src="restaurant.mainImage" class="main-img" />
        <div class="info">
          <h2>{{ restaurant.name }}</h2>
          <div class="line">地址：{{ restaurant.address }}</div>
          <div class="line">营业时间：{{ restaurant.openTime }}</div>
          <div class="line">评分 {{ restaurant.rating }} · 可容纳 {{ restaurant.capacity }} 人</div>
          <div class="line intro">{{ restaurant.intro }}</div>
        </div>
      </div>

      <!-- 菜品 -->
      <el-divider content-position="left">招牌菜品</el-divider>
      <div class="dishes">
        <el-card v-for="d in restaurant.dishes" :key="d.id" class="dish">
          <img v-if="d.image" :src="d.image" class="dish-img" />
          <div class="dish-name">{{ d.name }}</div>
          <div class="dish-price">¥{{ d.price }}</div>
        </el-card>
      </div>

      <!-- 餐位预订 -->
      <el-divider content-position="left">餐位预订</el-divider>
      <el-form :model="form" label-width="90px" class="book-form">
        <el-form-item label="预订日期">
          <el-date-picker v-model="form.bookingDate" type="date" :disabled-date="disablePast" value-format="YYYY-MM-DD" @change="loadSlots" />
        </el-form-item>
        <el-form-item label="用餐时段">
          <el-radio-group v-model="form.slotId">
            <el-radio v-for="s in restaurant.slots" :key="s.id" :value="s.id">
              {{ s.slotName }}（余 {{ s.remain }}）
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="用餐人数">
          <el-input-number v-model="form.guestCount" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactName" class="input" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" class="input" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="booking" @click="submitBooking">提交预订（免费，需提前 2 小时）</el-button>
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
const restaurant = ref<any>({});
const booking = ref(false);
const form = reactive({
  bookingDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
  slotId: 0,
  guestCount: 2,
  contactName: '',
  contactPhone: '',
});

function disablePast(d: Date) {
  return dayjs(d).isBefore(dayjs(), 'day');
}

async function load(loadSlotsAlso = false) {
  try {
    restaurant.value = await request.get(`/food/restaurants/${route.params.id}`, {
      params: { date: form.bookingDate },
    });
    if (loadSlotsAlso || !form.slotId) {
      form.slotId = restaurant.value.slots?.[0]?.id || 0;
    }
  } catch {
    // 已提示
  }
}

async function loadSlots() {
  await load(false);
}

async function submitBooking() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录');
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  if (!form.slotId) {
    ElMessage.warning('请选择用餐时段');
    return;
  }
  if (!form.contactName || !form.contactPhone) {
    ElMessage.warning('请填写联系人与电话');
    return;
  }
  booking.value = true;
  try {
    await request.post('/food/bookings', {
      restaurantId: restaurant.value.id,
      slotId: form.slotId,
      bookingDate: form.bookingDate,
      guestCount: form.guestCount,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
    });
    ElMessage.success('预订成功，可在我的订单中查看');
    router.push('/orders');
  } catch {
    // 已提示
  } finally {
    booking.value = false;
  }
}

onMounted(() => load());
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background: #FAFAF8;
}
.top {
  display: flex;
  gap: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}
.main-img {
  width: 400px;
  height: 280px;
  object-fit: cover;
  border-radius: 12px;
}
.info {
  flex: 1;
}
.line {
  margin-top: 10px;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}
.intro {
  line-height: 1.6;
  color: #333;
  font-size: 14px;
}
.dishes {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.dish {
  width: 200px;
  background: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.dish-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}
.dish-name {
  font-weight: 600;
  margin-top: 6px;
  font-size: 14px;
  color: #2C2C2C;
  line-height: 1.6;
}
.dish-price {
  color: #D4A017;
  margin-top: 4px;
  font-weight: 600;
  font-size: 16px;
}
.book-form {
  max-width: 560px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.input {
  width: 240px;
}
</style>
