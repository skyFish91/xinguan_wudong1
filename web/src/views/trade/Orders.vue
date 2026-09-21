<template>
  <div>
    <TopNav />
    <div class="page">
      <h2>我的订单</h2>
      <el-tabs v-model="statusTab" @tab-change="load(1)">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待支付" name="0" />
        <el-tab-pane label="已支付" name="1" />
        <el-tab-pane label="已确认" name="2" />
        <el-tab-pane label="进行中" name="3" />
        <el-tab-pane label="已完成" name="4" />
        <el-tab-pane label="退款相关" name="refund" />
      </el-tabs>

      <el-empty v-if="!list.length" description="暂无订单" />
      <div v-for="o in list" :key="o.id" class="order">
        <div class="order-head">
          <span class="order-no">{{ o.orderNo }}</span>
          <span class="order-time">{{ formatTime(o.createdAt) }}</span>
          <el-tag :type="statusTag(o.status)" size="small">{{ statusText(o.status) }}</el-tag>
        </div>
        <div class="order-remark" v-if="o.remark">{{ o.remark }}</div>

        <div v-for="it in o.items" :key="it.id" class="order-item">
          <img :src="it.image" class="item-img" />
          <div class="item-main">
            <div>{{ it.title }}</div>
            <div class="item-spec">{{ it.specName }}</div>
          </div>
          <div class="item-price">¥{{ it.price }} x {{ it.quantity }}</div>
        </div>

        <!-- 扩展信息 -->
        <div class="ext" v-if="o.mealBooking">
          餐位：{{ o.mealBooking.bookingDate }} · {{ o.mealBooking.guestCount }} 人 · 联系人 {{ o.mealBooking.contactName }} {{ o.mealBooking.contactPhone }}
        </div>
        <div class="ext" v-if="o.hotelBooking">
          住宿：{{ o.hotelBooking.checkInDate }} 至 {{ o.hotelBooking.checkOutDate }}（{{ o.hotelBooking.nights }} 晚）· 入住人 {{ o.hotelBooking.guestName }}
          <span v-if="o.status === 1 || o.status === 2">· 入住核销码：<b class="code">{{ o.hotelBooking.checkinCode }}</b></span>
        </div>
        <div class="ext" v-if="o.ticketOrder">
          票务：{{ o.ticketOrder.bizType === 'route' ? '路线' : '门票' }} · 使用日期 {{ o.ticketOrder.useDate }} · {{ o.ticketOrder.quantity }} 份
        </div>
        <div class="ext" v-if="o.refund">
          退款单 {{ o.refund.refundNo }}：<el-tag size="small" :type="o.refund.status === 0 ? 'warning' : o.refund.status === 1 ? 'success' : 'info'">
            {{ o.refund.status === 0 ? '审核中' : o.refund.status === 1 ? '已退款' : '已驳回' }}
          </el-tag>
          <span v-if="o.refund.handleNote">（{{ o.refund.handleNote }}）</span>
        </div>

        <div class="order-foot">
          <span class="total">合计 <span class="red">¥{{ o.totalAmount }}</span></span>
          <div class="ops">
            <el-button v-if="o.status === 0" size="small" @click="cancelOrder(o)">取消订单</el-button>
            <el-button v-if="o.status === 0" size="small" type="danger" @click="$router.push(`/pay/${o.id}`)">去支付</el-button>
            <el-button v-if="[1, 2, 3].includes(o.status)" size="small" @click="applyRefund(o)">申请退款</el-button>
            <el-button
              v-if="o.status === 3 && o.orderType === 'goods'"
              size="small"
              type="primary"
              @click="confirmReceive(o)"
            >
              确认收货
            </el-button>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="total > pageSize"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        class="pager"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const route = useRoute();
const router = useRouter();
const statusTab = ref(String(route.query.status ?? 'all'));
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;

const statusTexts: Record<number, string> = {
  0: '待支付', 1: '已支付', 2: '已确认', 3: '进行中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
};

function statusText(s: number) {
  return statusTexts[s] ?? '未知';
}

function statusTag(s: number): 'danger' | 'success' | 'warning' | 'info' {
  if (s === 0) return 'warning';
  if (s === 4) return 'success';
  if (s === 5) return 'info';
  if (s === 6 || s === 7) return 'info';
  return 'danger';
}

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

async function load(p = 1) {
  page.value = p;
  const params: any = { page: page.value, pageSize };
  if (statusTab.value === 'refund') {
    // 退款相关：直接请求全部再前端过滤，或按状态 6/7 分别查询后合并
    params.status = undefined;
  } else if (statusTab.value !== 'all') {
    params.status = Number(statusTab.value);
  }
  try {
    const data: any = await request.get('/orders/', { params });
    let items = data.list || [];
    if (statusTab.value === 'refund') {
      items = items.filter((o: any) => [6, 7].includes(o.status));
    }
    list.value = items;
    total.value = statusTab.value === 'refund' ? items.length : data.total || 0;
  } catch {
    // 已提示
  }
}

async function cancelOrder(o: any) {
  try {
    await ElMessageBox.confirm('确定取消该订单？库存将释放。', '提示', { type: 'warning' });
    await request.post(`/orders/${o.id}/cancel`, null, { params: { reason: '用户主动取消' } });
    ElMessage.success('订单已取消');
    load(page.value);
  } catch (e: any) {
    // 取消操作或已提示
  }
}

async function applyRefund(o: any) {
  try {
    const { value } = await ElMessageBox.prompt('请填写退款原因', '申请退款', {
      inputValue: '行程有变',
    });
    await request.post(`/orders/${o.id}/refund`, null, { params: { reason: value || '' } });
    ElMessage.success('退款申请已提交，等待平台审核');
    load(page.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

async function confirmReceive(o: any) {
  try {
    await ElMessageBox.confirm('确认已收到全部商品？', '提示', { type: 'warning' });
    await request.post(`/orders/${o.id}/receive`);
    ElMessage.success('已确认收货，订单完成');
    load(page.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

onMounted(() => load(1));
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}
.order {
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 14px;
  padding: 14px;
}
.order-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.order-no {
  font-weight: 600;
}
.order-time {
  color: #999;
  font-size: 12px;
  flex: 1;
}
.order-remark {
  color: #666;
  font-size: 13px;
  margin-top: 6px;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.item-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
}
.item-main {
  flex: 1;
}
.item-spec {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.item-price {
  color: #666;
}
.ext {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 13px;
  color: #555;
}
.code {
  color: #c0392b;
}
.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.red {
  color: #c0392b;
  font-size: 18px;
  font-weight: bold;
}
.ops {
  display: flex;
  gap: 8px;
}
.pager {
  margin-top: 20px;
  justify-content: center;
}
</style>
