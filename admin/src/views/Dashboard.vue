<template>
  <div>
    <!-- 平台管理员 -->
    <template v-if="userStore.role === 'admin'">
      <div class="cards">
        <el-card v-for="c in adminCards" :key="c.label" class="card">
          <div class="card-num">{{ c.value }}</div>
          <div class="card-label">{{ c.label }}</div>
        </el-card>
      </div>
      <el-card class="panel">
        <template #header>订单状态分布</template>
        <div class="status-row">
          <el-tag v-for="s in statusList" :key="s.status" :type="s.status === 0 ? 'warning' : 'info'" class="status-tag">
            {{ statusText(s.status) }}：{{ s.count }}
          </el-tag>
        </div>
      </el-card>
    </template>

    <!-- 商家 -->
    <template v-else>
      <div class="cards">
        <el-card v-for="(v, k) in merchantStats" :key="k" class="card">
          <div class="card-num">{{ v }}</div>
          <div class="card-label">{{ k }}</div>
        </el-card>
      </div>
      <el-empty v-if="!Object.keys(merchantStats).length" description="暂无统计数据" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import request from '../api/request';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const adminData = ref<any>({});
const merchantStats = ref<Record<string, any>>({});

const statusTexts: Record<number, string> = {
  0: '待支付', 1: '已支付', 2: '已确认', 3: '进行中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
};

function statusText(s: number) {
  return statusTexts[s] ?? `状态${s}`;
}

const adminCards = computed(() => [
  { label: '注册用户', value: adminData.value.userCount ?? 0 },
  { label: '今日新增用户', value: adminData.value.todayUsers ?? 0 },
  { label: '订单总数', value: adminData.value.orderCount ?? 0 },
  { label: '今日订单', value: adminData.value.todayOrders ?? 0 },
  { label: '成交总额 GMV', value: `¥${adminData.value.gmv?.total ?? 0}` },
  { label: '入驻商家', value: adminData.value.merchantCount ?? 0 },
  { label: '待审商家申请', value: adminData.value.pendingApplies ?? 0 },
  { label: '浏览量 PV', value: adminData.value.pv ?? 0 },
]);

const statusList = computed(() => adminData.value.byStatus || []);

onMounted(async () => {
  if (userStore.role === 'admin') {
    try {
      adminData.value = await request.get('/admin/dashboard');
    } catch {
      // 已提示
    }
  } else {
    const apiMap: Record<string, string> = {
      clothing: '/clothing/admin/stats',
      food: '/food/admin/stats',
      hotel: '/hotel/admin/stats',
      travel: '/travel/admin/stats',
    };
    try {
      merchantStats.value = await request.get(apiMap[userStore.moduleType]);
    } catch {
      // 已提示
    }
  }
});
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.card {
  text-align: center;
}
.card-num {
  font-size: 26px;
  font-weight: bold;
  color: #2b3a4a;
}
.card-label {
  color: #999;
  margin-top: 6px;
  font-size: 13px;
}
.panel {
  margin-top: 16px;
}
.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.status-tag {
  font-size: 13px;
}
</style>
