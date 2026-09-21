<template>
  <div>
    <el-card>
      <el-tabs v-model="tab" @tab-change="reload">
        <!-- 路线 -->
        <el-tab-pane label="路线套餐" name="routes">
          <div class="toolbar">
            <el-button type="success" @click="openRoute()">新增路线</el-button>
          </div>
          <el-table :data="routes" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="路线名" />
            <el-table-column prop="days" label="天数" width="70" />
            <el-table-column prop="price" label="价格" width="90" />
            <el-table-column prop="themes" label="主题" width="100" />
            <el-table-column prop="sales" label="销量" width="80" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '上架中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button link type="primary" @click="openRoute(row)">编辑</el-button>
                <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleRoute(row)">{{ row.status === 1 ? '下架' : '上架' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!routes.length" description="暂无路线" />
        </el-tab-pane>

        <!-- 核销 -->
        <el-tab-pane label="电子票核销" name="verify">
          <div class="checkin-box">
            <el-input v-model="eticketCode" placeholder="输入或扫描电子票号" class="code-input" @keyup.enter="verifyEticket" />
            <el-button type="primary" @click="verifyEticket">核销</el-button>
          </div>
          <el-alert
            v-if="verifyResult"
            :title="verifyResult.verified ? `核销成功：${verifyResult.visitorName}（${verifyResult.code}）` : verifyResult.message"
            :type="verifyResult.verified ? 'success' : 'error'"
            :closable="false"
            show-icon
            class="result"
          />
        </el-tab-pane>

        <!-- 电子票列表 -->
        <el-tab-pane label="电子票记录" name="etickets">
          <div class="toolbar">
            <el-select v-model="eticketStatus" placeholder="全部状态" clearable class="select" @change="loadEtickets(1)">
              <el-option label="未核销" value="0" />
              <el-option label="已核销" value="1" />
              <el-option label="已退款" value="2" />
            </el-select>
            <el-button type="primary" @click="loadEtickets(1)">查询</el-button>
          </div>
          <el-table :data="etickets" border>
            <el-table-column prop="code" label="票号" width="170" />
            <el-table-column prop="visitorName" label="游客" width="110" />
            <el-table-column prop="useDate" label="使用日期" width="110" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'warning'" size="small">
                  {{ row.status === 0 ? '未核销' : row.status === 1 ? '已核销' : '已退款' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="核销时间" width="160">
              <template #default="{ row }">{{ formatTime(row.verifyAt) || '-' }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="eticketTotal"
            :page-size="10"
            :current-page="eticketPage"
            class="pager"
            @current-change="loadEtickets"
          />
        </el-tab-pane>

        <!-- 订单 -->
        <el-tab-pane label="票务订单" name="orders">
          <div class="toolbar">
            <el-select v-model="orderStatus" placeholder="全部状态" clearable class="select" @change="loadOrders(1)">
              <el-option v-for="(t, s) in statusTexts" :key="s" :label="t" :value="Number(s)" />
            </el-select>
            <el-button type="primary" @click="loadOrders(1)">查询</el-button>
          </div>
          <el-table :data="orders" border>
            <el-table-column prop="orderNo" label="订单号" width="170" />
            <el-table-column label="类型" width="90">
              <template #default="{ row }">{{ row.orderType === 'ticket' ? '门票' : '路线' }}</template>
            </el-table-column>
            <el-table-column label="内容" width="240">
              <template #default="{ row }">
                <span v-if="row.ticketOrder">{{ row.ticketOrder.ticketTitle }} × {{ row.ticketOrder.quantity }}（{{ row.ticketOrder.useDate }}）</span>
                <span v-else>{{ row.remark }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="金额" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small">{{ statusTexts[row.status] || `状态${row.status}` }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="orderTotal"
            :page-size="10"
            :current-page="orderPage"
            class="pager"
            @current-change="loadOrders"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 路线弹窗 -->
    <el-dialog v-model="routeDialog" :title="routeForm.id ? '编辑路线' : '新增路线'" width="640px" top="5vh">
      <el-form label-width="90px">
        <el-form-item label="路线名"><el-input v-model="routeForm.title" /></el-form-item>
        <el-form-item label="天数"><el-input-number v-model="routeForm.days" :min="1" controls-position="right" /></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="routeForm.price" :min="0" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="主题"><el-input v-model="routeForm.themes" placeholder="如 研学,亲子" /></el-form-item>
        <el-form-item label="出发地"><el-input v-model="routeForm.departFrom" /></el-form-item>
        <el-form-item label="目的地"><el-input v-model="routeForm.dest" /></el-form-item>
        <el-form-item label="费用包含"><el-input v-model="routeForm.included" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="预订须知"><el-input v-model="routeForm.notice" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="主图URL"><el-input v-model="routeForm.mainImage" placeholder="http://..." /></el-form-item>
        <el-form-item label="详情"><el-input v-model="routeForm.detail" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="逐日行程">
          <div class="itinerary-box">
            <div v-for="(it, i) in routeForm.itineraries" :key="i" class="it-row">
              <el-input-number v-model="it.dayNo" :min="1" size="small" class="it-day" />
              <el-input v-model="it.description" size="small" placeholder="行程描述" class="it-desc" />
              <el-input v-model="it.scenic" size="small" placeholder="景点" class="it-item" />
              <el-input v-model="it.meal" size="small" placeholder="餐饮" class="it-item" />
              <el-input v-model="it.hotel" size="small" placeholder="住宿" class="it-item" />
              <el-input v-model="it.transport" size="small" placeholder="交通" class="it-item" />
              <el-button link type="danger" @click="routeForm.itineraries.splice(i, 1)">删除</el-button>
            </div>
            <el-button size="small" @click="routeForm.itineraries.push({ dayNo: routeForm.itineraries.length + 1, description: '', scenic: '', meal: '', hotel: '', transport: '' })">
              添加行程日
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="routeForm.status" :active-value="1" :inactive-value="0" active-text="上架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="routeDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRoute">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';

const tab = ref('routes');

// 路线
const routes = ref<any[]>([]);
const routeDialog = ref(false);
const routeForm = reactive<any>({});

// 核销
const eticketCode = ref('');
const verifyResult = ref<any>(null);

// 电子票
const eticketStatus = ref('');
const etickets = ref<any[]>([]);
const eticketTotal = ref(0);
const eticketPage = ref(1);

// 订单
const orderStatus = ref('');
const orders = ref<any[]>([]);
const orderTotal = ref(0);
const orderPage = ref(1);

const statusTexts: Record<number, string> = {
  0: '待支付', 1: '已支付', 2: '已确认', 3: '进行中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
};

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

async function loadRoutes() {
  try {
    routes.value = await request.get('/merchant/travel/routes');
  } catch {
    // 已提示
  }
}

async function openRoute(row?: any) {
  if (row?.id) {
    try {
      const detail: any = await request.get(`/merchant/travel/routes/${row.id}`);
      Object.assign(routeForm, {
        id: detail.id, title: detail.title, days: detail.days, price: Number(detail.price),
        themes: detail.themes, departFrom: detail.departFrom, dest: detail.dest,
        included: detail.included || '', notice: detail.notice || '', mainImage: detail.mainImage,
        detail: detail.detail || '', status: detail.status,
        itineraries: (detail.itineraries || []).map((it: any) => ({
          dayNo: it.dayNo, description: it.description, scenic: it.scenic, meal: it.meal, hotel: it.hotel, transport: it.transport,
        })),
      });
    } catch {
      return;
    }
  } else {
    Object.assign(routeForm, {
      id: undefined, title: '', days: 1, price: 0, themes: '', departFrom: '乌东村游客中心', dest: '',
      included: '', notice: '', mainImage: '', detail: '', status: 1,
      itineraries: [{ dayNo: 1, description: '', scenic: '', meal: '', hotel: '', transport: '' }],
    });
  }
  routeDialog.value = true;
}

async function saveRoute() {
  if (!routeForm.title) {
    ElMessage.warning('请填写路线名');
    return;
  }
  const itineraries = (routeForm.itineraries || []).filter((it: any) => it.description);
  try {
    await request.post('/merchant/travel/routes/save', {
      ...routeForm,
      itineraries: itineraries.length ? itineraries : undefined,
    });
    ElMessage.success('已保存');
    routeDialog.value = false;
    loadRoutes();
  } catch {
    // 已提示
  }
}

async function toggleRoute(row: any) {
  try {
    await request.post(`/merchant/travel/routes/${row.id}/toggle`);
    ElMessage.success('已切换');
    loadRoutes();
  } catch {
    // 已提示
  }
}

async function verifyEticket() {
  if (!eticketCode.value.trim()) {
    ElMessage.warning('请输入电子票号');
    return;
  }
  try {
    verifyResult.value = await request.post('/merchant/travel/etickets/verify', { code: eticketCode.value.trim() });
    if (verifyResult.value.verified) {
      eticketCode.value = '';
      loadEtickets(eticketPage.value);
    }
  } catch {
    verifyResult.value = null;
    // 已提示
  }
}

async function loadEtickets(p = 1) {
  eticketPage.value = p;
  try {
    const data: any = await request.get('/merchant/travel/etickets', {
      params: { status: eticketStatus.value || undefined, page: eticketPage.value, pageSize: 10 },
    });
    etickets.value = data.list || [];
    eticketTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function loadOrders(p = 1) {
  orderPage.value = p;
  try {
    const data: any = await request.get('/merchant/travel/orders', {
      params: { status: orderStatus.value || undefined, page: orderPage.value, pageSize: 10 },
    });
    orders.value = data.list || [];
    orderTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

function reload() {
  if (tab.value === 'routes') loadRoutes();
  if (tab.value === 'etickets') loadEtickets(1);
  if (tab.value === 'orders') loadOrders(1);
}

onMounted(() => {
  loadRoutes();
  loadEtickets(1);
  loadOrders(1);
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.select {
  width: 140px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.checkin-box {
  display: flex;
  gap: 12px;
  max-width: 480px;
}
.code-input {
  flex: 1;
}
.result {
  margin-top: 14px;
  max-width: 560px;
}
.itinerary-box {
  width: 100%;
}
.it-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  align-items: center;
}
.it-day {
  width: 90px;
}
.it-desc {
  flex: 2;
}
.it-item {
  flex: 1;
  min-width: 90px;
}
</style>
