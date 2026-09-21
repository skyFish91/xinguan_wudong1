<template>
  <div>
    <el-card>
      <el-tabs v-model="tab" @tab-change="reload">
        <!-- 民宿 -->
        <el-tab-pane label="民宿管理" name="homestays">
          <div class="toolbar">
            <el-button type="success" @click="openHomestay()">新增民宿</el-button>
          </div>
          <el-table :data="homestays" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="名称" width="180" />
            <el-table-column prop="address" label="地址" />
            <el-table-column prop="styleTags" label="风格标签" width="150" />
            <el-table-column prop="rating" label="评分" width="70" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '上架中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button link type="primary" @click="openHomestay(row)">编辑</el-button>
                <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleHomestay(row)">{{ row.status === 1 ? '下架' : '上架' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 房型 -->
        <el-tab-pane label="房型管理" name="rooms">
          <div class="toolbar">
            <el-select v-model="roomHomestayId" placeholder="全部民宿" clearable class="select" @change="loadRooms">
              <el-option v-for="h in homestays" :key="h.id" :label="h.name" :value="h.id" />
            </el-select>
            <el-button type="success" @click="openRoom()">新增房型</el-button>
          </div>
          <el-table :data="rooms" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="房型" width="180" />
            <el-table-column prop="bedType" label="床型" width="120" />
            <el-table-column prop="area" label="面积" width="80" />
            <el-table-column prop="capacity" label="可住" width="70" />
            <el-table-column prop="price" label="价格" width="90" />
            <el-table-column prop="stock" label="库存" width="70" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '在售' : '停售' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button link type="primary" @click="openRoom(row)">编辑</el-button>
                <el-button link type="danger" @click="deleteRoom(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 房态日历 -->
        <el-tab-pane label="房态日历" name="calendar">
          <div class="toolbar">
            <el-select v-model="calHomestayId" placeholder="选择民宿" class="select" @change="onCalHomestayChange">
              <el-option v-for="h in homestays" :key="h.id" :label="h.name" :value="h.id" />
            </el-select>
            <el-select v-model="calRoomId" placeholder="选择房型" class="select" @change="loadCalendar">
              <el-option v-for="r in calRooms" :key="r.id" :label="r.name" :value="r.id" />
            </el-select>
            <el-button type="warning" :disabled="!selectedDates.length" @click="batchDialog = true">
              批量设置所选 {{ selectedDates.length }} 天
            </el-button>
          </div>
          <el-table :data="calList" border size="small" @selection-change="onSelectDates" max-height="560">
            <el-table-column type="selection" width="45" />
            <el-table-column prop="invDate" label="日期" width="120" />
            <el-table-column prop="price" label="价格" width="100" />
            <el-table-column prop="booked" label="已订" width="80" />
            <el-table-column prop="total" label="总库存" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '可订' : '关闭' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!calList.length" description="请选择民宿和房型查看房态" />
        </el-tab-pane>

        <!-- 订单 -->
        <el-tab-pane label="住宿订单" name="orders">
          <div class="toolbar">
            <el-select v-model="orderStatus" placeholder="全部状态" clearable class="select" @change="loadOrders(1)">
              <el-option v-for="(t, s) in statusTexts" :key="s" :label="t" :value="Number(s)" />
            </el-select>
            <el-button type="primary" @click="loadOrders(1)">查询</el-button>
          </div>
          <el-table :data="orders" border>
            <el-table-column prop="orderNo" label="订单号" width="170" />
            <el-table-column label="入住信息" width="240">
              <template #default="{ row }">
                <span v-if="row.booking">{{ row.booking.checkinDate }} ~ {{ row.booking.checkoutDate }}（{{ row.booking.guestName }}）</span>
              </template>
            </el-table-column>
            <el-table-column label="入住码" width="120">
              <template #default="{ row }">{{ row.booking?.checkinCode || '-' }}</template>
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

        <!-- 核销 -->
        <el-tab-pane label="入住核验" name="checkin">
          <div class="checkin-box">
            <el-input v-model="checkinCode" placeholder="输入或扫描顾客入住码" class="code-input" @keyup.enter="verifyCheckin" />
            <el-button type="primary" @click="verifyCheckin">核验办理入住</el-button>
          </div>
          <el-alert
            v-if="checkinResult"
            :title="checkinResult.message"
            :type="checkinResult.verified ? 'success' : 'error'"
            :closable="false"
            show-icon
            class="result"
          >
            <template v-if="checkinResult.orderNo" #default>
              订单号：{{ checkinResult.orderNo }}，房客：{{ checkinResult.booking?.guestName }}，入住：{{ checkinResult.booking?.checkinDate }} ~ {{ checkinResult.booking?.checkoutDate }}
            </template>
          </el-alert>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 民宿弹窗 -->
    <el-dialog v-model="homestayDialog" :title="hsForm.id ? '编辑民宿' : '新增民宿'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="名称"><el-input v-model="hsForm.name" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="hsForm.address" /></el-form-item>
        <el-form-item label="风格标签"><el-input v-model="hsForm.styleTags" placeholder="逗号分隔，如 苗寨,山景" /></el-form-item>
        <el-form-item label="设施标签"><el-input v-model="hsForm.facilityTags" placeholder="逗号分隔" /></el-form-item>
        <el-form-item label="主图URL"><el-input v-model="hsForm.mainImage" placeholder="http://..." /></el-form-item>
        <el-form-item label="介绍"><el-input v-model="hsForm.intro" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="入住时间"><el-input v-model="hsForm.checkInTime" placeholder="14:00" /></el-form-item>
        <el-form-item label="退房时间"><el-input v-model="hsForm.checkOutTime" placeholder="12:00" /></el-form-item>
        <el-form-item label="押金"><el-input-number v-model="hsForm.deposit" :min="0" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="含早餐"><el-switch v-model="hsForm.hasBreakfast" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item label="可带宠物"><el-switch v-model="hsForm.petPolicy" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="hsForm.status" :active-value="1" :inactive-value="0" active-text="上架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="homestayDialog = false">取消</el-button>
        <el-button type="primary" @click="saveHomestay">保存</el-button>
      </template>
    </el-dialog>

    <!-- 房型弹窗 -->
    <el-dialog v-model="roomDialog" :title="roomForm.id ? '编辑房型' : '新增房型'" width="480px">
      <el-form label-width="80px">
        <el-form-item label="所属民宿">
          <el-select v-model="roomForm.homestayId" placeholder="选择民宿" style="width: 100%">
            <el-option v-for="h in homestays" :key="h.id" :label="h.name" :value="h.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="房型名"><el-input v-model="roomForm.name" /></el-form-item>
        <el-form-item label="床型"><el-input v-model="roomForm.bedType" placeholder="如 1.8m 大床" /></el-form-item>
        <el-form-item label="面积">
          <el-input-number v-model="roomForm.area" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="可住人数"><el-input-number v-model="roomForm.capacity" :min="1" controls-position="right" /></el-form-item>
        <el-form-item label="设施"><el-input v-model="roomForm.facilities" placeholder="逗号分隔，如 WiFi,空调" /></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="roomForm.price" :min="0" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="roomForm.stock" :min="1" controls-position="right" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="roomForm.mainImage" placeholder="http://..." /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="roomForm.status" :active-value="1" :inactive-value="0" active-text="在售" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置弹窗 -->
    <el-dialog v-model="batchDialog" title="批量设置房态" width="400px">
      <p class="batch-tip">已选择 {{ selectedDates.length }} 个日期：{{ selectedDates.slice(0, 3).join('、') }}{{ selectedDates.length > 3 ? ' ...' : '' }}</p>
      <el-form label-width="80px">
        <el-form-item label="可订状态">
          <el-switch v-model="batchForm.available" active-text="可订" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="动态价格">
          <el-input-number v-model="batchForm.price" :min="0" :precision="2" :controls="false" placeholder="留空则不改价" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog = false">取消</el-button>
        <el-button type="primary" @click="submitBatch">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

const tab = ref('homestays');

// 民宿
const homestays = ref<any[]>([]);
const homestayDialog = ref(false);
const hsForm = reactive<any>({});

// 房型
const roomHomestayId = ref<number | undefined>(undefined);
const rooms = ref<any[]>([]);
const roomDialog = ref(false);
const roomForm = reactive<any>({});

// 日历
const calHomestayId = ref<number | undefined>(undefined);
const calRoomId = ref<number | undefined>(undefined);
const calRooms = ref<any[]>([]);
const calList = ref<any[]>([]);
const selectedDates = ref<string[]>([]);
const batchDialog = ref(false);
const batchForm = reactive<any>({ available: true, price: undefined });

// 订单
const orderStatus = ref('');
const orders = ref<any[]>([]);
const orderTotal = ref(0);
const orderPage = ref(1);

// 核销
const checkinCode = ref('');
const checkinResult = ref<any>(null);

const statusTexts: Record<number, string> = {
  0: '待支付', 1: '已支付', 2: '已确认', 3: '进行中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
};

async function loadHomestays() {
  try {
    homestays.value = await request.get('/merchant/hotel/homestays');
  } catch {
    // 已提示
  }
}

function openHomestay(row?: any) {
  Object.assign(hsForm, row
    ? {
        id: row.id, name: row.name, address: row.address, styleTags: row.styleTags, facilityTags: row.facilityTags,
        mainImage: row.mainImage, intro: row.intro || '', checkInTime: row.checkInTime, checkOutTime: row.checkOutTime,
        deposit: Number(row.deposit || 0), hasBreakfast: row.hasBreakfast, petPolicy: row.petPolicy, status: row.status,
      }
    : {
        id: undefined, name: '', address: '', styleTags: '', facilityTags: '', mainImage: '', intro: '',
        checkInTime: '14:00', checkOutTime: '12:00', deposit: 0, hasBreakfast: 1, petPolicy: 0, status: 1,
      });
  homestayDialog.value = true;
}

async function saveHomestay() {
  if (!hsForm.name || !hsForm.address) {
    ElMessage.warning('请填写名称和地址');
    return;
  }
  try {
    await request.post('/merchant/hotel/homestays/save', hsForm);
    ElMessage.success('已保存');
    homestayDialog.value = false;
    loadHomestays();
  } catch {
    // 已提示
  }
}

async function toggleHomestay(row: any) {
  try {
    await request.post(`/merchant/hotel/homestays/${row.id}/toggle`);
    ElMessage.success('已切换');
    loadHomestays();
  } catch {
    // 已提示
  }
}

async function loadRooms() {
  try {
    rooms.value = await request.get('/merchant/hotel/rooms', {
      params: { homestayId: roomHomestayId.value || undefined },
    });
  } catch {
    // 已提示
  }
}

function openRoom(row?: any) {
  Object.assign(roomForm, row
    ? {
        id: row.id, homestayId: row.homestayId, name: row.name, bedType: row.bedType, area: Number(row.area || 0),
        capacity: row.capacity, facilities: row.facilities, price: Number(row.price), stock: row.stock,
        mainImage: row.mainImage, status: row.status,
      }
    : {
        id: undefined, homestayId: roomHomestayId.value, name: '', bedType: '', area: 0, capacity: 2,
        facilities: '', price: 0, stock: 1, mainImage: '', status: 1,
      });
  roomDialog.value = true;
}

async function saveRoom() {
  if (!roomForm.name || !roomForm.homestayId) {
    ElMessage.warning('请选择民宿并填写房型名');
    return;
  }
  try {
    await request.post('/merchant/hotel/rooms/save', roomForm);
    ElMessage.success('已保存');
    roomDialog.value = false;
    loadRooms();
  } catch {
    // 已提示
  }
}

async function deleteRoom(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除房型「${row.name}」？`, '提示', { type: 'warning' });
    await request.post(`/merchant/hotel/rooms/${row.id}/delete`);
    ElMessage.success('已删除');
    loadRooms();
  } catch (e: any) {
    // 取消或已提示
  }
}

function onCalHomestayChange() {
  calRoomId.value = undefined;
  calList.value = [];
  selectedDates.value = [];
  calRooms.value = rooms.value.filter(r => r.homestayId === calHomestayId.value);
  if (calRooms.value.length === 1) {
    calRoomId.value = calRooms.value[0].id;
    loadCalendar();
  }
}

async function loadCalendar() {
  selectedDates.value = [];
  if (!calRoomId.value) {
    calList.value = [];
    return;
  }
  try {
    const data: any = await request.get('/merchant/hotel/calendar', {
      params: { roomTypeId: calRoomId.value },
    });
    calList.value = data.list || [];
  } catch {
    // 已提示
  }
}

function onSelectDates(rows: any[]) {
  selectedDates.value = rows.map(r => r.invDate);
}

async function submitBatch() {
  if (!selectedDates.value.length || !calRoomId.value) {
    ElMessage.warning('请先选择日期');
    return;
  }
  try {
    await request.post('/merchant/hotel/calendar/batch-set', {
      roomTypeId: calRoomId.value,
      dates: selectedDates.value,
      available: !!batchForm.available,
      price: batchForm.price === undefined || batchForm.price === null ? undefined : batchForm.price,
    });
    ElMessage.success('已批量设置');
    batchDialog.value = false;
    loadCalendar();
  } catch {
    // 已提示
  }
}

async function loadOrders(p = 1) {
  orderPage.value = p;
  try {
    const data: any = await request.get('/merchant/hotel/orders', {
      params: { status: orderStatus.value || undefined, page: orderPage.value, pageSize: 10 },
    });
    orders.value = data.list || [];
    orderTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function verifyCheckin() {
  if (!checkinCode.value.trim()) {
    ElMessage.warning('请输入入住码');
    return;
  }
  try {
    checkinResult.value = await request.post('/merchant/hotel/checkin/verify', { code: checkinCode.value.trim() });
    if (checkinResult.value.verified) {
      checkinCode.value = '';
      loadOrders(orderPage.value);
    }
  } catch {
    checkinResult.value = null;
    // 已提示
  }
}

function reload() {
  if (tab.value === 'homestays') loadHomestays();
  if (tab.value === 'rooms') loadRooms();
  if (tab.value === 'calendar') loadCalendar();
  if (tab.value === 'orders') loadOrders(1);
}

onMounted(() => {
  loadHomestays();
  loadRooms();
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
  width: 180px;
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
.batch-tip {
  margin: 0 0 12px;
  color: #666;
  font-size: 13px;
}
</style>
