<template>
  <div>
    <TopNav />
    <div class="page" v-if="homestay.id">
      <div class="top">
        <img :src="homestay.mainImage" class="main-img" />
        <div class="info">
          <h2>{{ homestay.name }}</h2>
          <div class="line">地址：{{ homestay.address }}</div>
          <div class="line">入住 {{ homestay.checkInTime }} · 离店 {{ homestay.checkOutTime }}</div>
          <div class="line">评分 {{ homestay.rating }} · 含早餐{{ homestay.hasBreakfast ? '是' : '否' }} · 允许宠物{{ homestay.petPolicy ? '是' : '否' }} · 押金 ¥{{ homestay.deposit }}</div>
          <div class="tags">
            <el-tag v-for="t in splitTags(homestay.styleTags)" :key="t" size="small" class="tag">{{ t }}</el-tag>
          </div>
          <div class="line intro">{{ homestay.intro }}</div>
        </div>
      </div>

      <el-divider content-position="left">房型选择</el-divider>
      <div class="rooms">
        <div
          v-for="r in homestay.rooms"
          :key="r.id"
          class="room-card"
          :class="{ selected: selectedRoom?.id === r.id }"
          @click="onSelectRoom(r)"
        >
          <div class="room-header">
            <div class="room-name">{{ r.name }}</div>
            <div class="room-meta">{{ r.bedType }} · {{ r.area }}㎡ · 可住 {{ r.capacity }} 人</div>
          </div>
          <div class="room-facilities">
            <span v-for="fac in splitFacilities(r.facilities)" :key="fac" class="fac-tag">{{ fac }}</span>
          </div>
          <div class="room-footer">
            <div class="price-section">
              <div class="room-price">¥{{ r.price }} <span class="price-unit">/ 晚</span></div>
              <div class="room-stock" v-if="r.stock !== undefined">仅剩 {{ r.stock }} 间</div>
            </div>
            <button class="select-btn" :class="{ selected: selectedRoom?.id === r.id }">
              {{ selectedRoom?.id === r.id ? '已选择' : '选择' }}
            </button>
          </div>
          <div class="check-mark" v-if="selectedRoom?.id === r.id">✓</div>
        </div>
      </div>

      <!-- 预订表单 -->
      <template v-if="selectedRoom">
        <el-divider content-position="left">预订信息</el-divider>
        <el-form :model="form" label-width="100px" class="book-form">
          <el-form-item label="入住日期">
            <el-date-picker
              v-model="form.dates"
              type="daterange"
              value-format="YYYY-MM-DD"
              :disabled-date="disablePast"
              @change="calcPrice"
            />
          </el-form-item>
          <el-form-item v-if="priceResult">
            <div class="price-detail">
              <div v-for="d in priceResult.detail" :key="d.date" class="price-night">{{ d.date }}：¥{{ d.price }}</div>
              <div class="price-total">共 {{ priceResult.nights }} 晚，合计 <span class="red">¥{{ priceResult.total }}</span></div>
            </div>
          </el-form-item>
          <el-form-item label="入住人">
            <el-input v-model="form.guestName" class="input" />
          </el-form-item>
          <el-form-item label="身份证号">
            <el-input v-model="form.guestIdCard" class="input" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.guestPhone" class="input" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="booking" @click="submitBooking">提交预订并支付</el-button>
          </el-form-item>
        </el-form>
      </template>
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
const homestay = ref<any>({});
const selectedRoom = ref<any>(null);
const priceResult = ref<any>(null);
const booking = ref(false);
const form = reactive({
  dates: [dayjs().add(1, 'day').format('YYYY-MM-DD'), dayjs().add(2, 'day').format('YYYY-MM-DD')],
  guestName: '',
  guestIdCard: '',
  guestPhone: '',
});

function splitTags(tags: string) {
  return tags ? tags.split(',').filter(t => t) : [];
}

function splitFacilities(facilities: string) {
  return facilities ? facilities.split(/[,，、]/).filter(f => f.trim()).map(f => f.trim()) : [];
}

function disablePast(d: Date) {
  return dayjs(d).isBefore(dayjs(), 'day');
}

async function load() {
  try {
    homestay.value = await request.get(`/hotel/homestays/${route.params.id}`);
    if (homestay.value.rooms?.length) {
      selectedRoom.value = homestay.value.rooms[0];
      await calcPrice();
    }
  } catch {
    // 已提示
  }
}

function onSelectRoom(r: any) {
  selectedRoom.value = r;
  priceResult.value = null;
  if (form.dates) {
    calcPrice();
  }
}

async function calcPrice() {
  if (!selectedRoom.value || !form.dates || form.dates.length !== 2) {
    return;
  }
  try {
    priceResult.value = await request.get('/hotel/price', {
      params: {
        roomTypeId: selectedRoom.value.id,
        checkInDate: form.dates[0],
        checkOutDate: form.dates[1],
      },
    });
  } catch {
    priceResult.value = null;
  }
}

async function submitBooking() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录');
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  if (!form.dates || form.dates.length !== 2) {
    ElMessage.warning('请选择入住日期');
    return;
  }
  if (!form.guestName || !form.guestIdCard || !form.guestPhone) {
    ElMessage.warning('请填写入住人信息');
    return;
  }
  booking.value = true;
  try {
    const order: any = await request.post('/hotel/bookings', {
      homestayId: homestay.value.id,
      roomTypeId: selectedRoom.value.id,
      checkInDate: form.dates[0],
      checkOutDate: form.dates[1],
      guestName: form.guestName,
      guestIdCard: form.guestIdCard,
      guestPhone: form.guestPhone,
    });
    router.push(`/pay/${order.id}`);
  } catch {
    // 已提示
  } finally {
    booking.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page {
  max-width: 1100px;
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
  width: 420px;
  height: 300px;
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
.tags {
  margin-top: 10px;
}
.tag {
  margin-right: 6px;
}
.rooms {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
.room-card {
  position: relative;
  background: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}
.room-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.room-card.selected {
  border-color: #D4A017;
  box-shadow: 0 2px 12px rgba(212, 160, 23, 0.2);
}
.room-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.room-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.room-meta {
  font-size: 13px;
  color: #888;
}
.room-facilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0;
}
.fac-tag {
  display: inline-block;
  padding: 3px 10px;
  font-size: 12px;
  color: #333;
  background: #f5f5f5;
  border-radius: 4px;
}
.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
.price-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.room-price {
  font-size: 24px;
  font-weight: 700;
  color: #D4A017;
}
.price-unit {
  font-size: 14px;
  font-weight: 400;
  color: #999;
}
.room-stock {
  font-size: 12px;
  color: #999;
}
.select-btn {
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: #D4A017;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.select-btn:hover {
  background: #c09015;
}
.select-btn.selected {
  background: #D4A017;
}
.check-mark {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #D4A017;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 50%;
}
.book-form {
  max-width: 560px;
}
.input {
  width: 260px;
}
.price-detail {
  background: #FFF9E6;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.6;
}
.price-night {
  color: #333;
  font-size: 14px;
}
.price-total {
  font-weight: 600;
  font-size: 14px;
  color: #2C2C2C;
}
.red {
  color: #D4A017;
  font-size: 20px;
}
</style>
