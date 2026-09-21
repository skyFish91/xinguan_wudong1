<template>
  <div>
    <el-card>
      <el-tabs v-model="tab" @tab-change="reload">
        <!-- 餐厅信息 -->
        <el-tab-pane label="餐厅信息" name="restaurant">
          <el-form label-width="100px" class="rest-form">
            <el-form-item label="餐厅名称"><el-input v-model="restForm.name" /></el-form-item>
            <el-form-item label="地址"><el-input v-model="restForm.address" /></el-form-item>
            <el-form-item label="营业时间"><el-input v-model="restForm.openTime" placeholder="如 11:00-21:00" /></el-form-item>
            <el-form-item label="餐位容量"><el-input-number v-model="restForm.capacity" :min="1" controls-position="right" /></el-form-item>
            <el-form-item label="主图URL"><el-input v-model="restForm.mainImage" placeholder="http://..." /></el-form-item>
            <el-form-item label="餐厅介绍"><el-input v-model="restForm.intro" type="textarea" :rows="4" /></el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveRestaurant">保存餐厅信息</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 菜品 -->
        <el-tab-pane label="菜品管理" name="dishes">
          <div class="toolbar">
            <el-button type="success" @click="openDish()">新增菜品</el-button>
          </div>
          <el-table :data="dishes" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="菜名" width="180" />
            <el-table-column prop="price" label="价格" width="90" />
            <el-table-column prop="intro" label="介绍" />
            <el-table-column label="招牌" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.isSignature" type="warning" size="small">招牌</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '上架中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDish(row)">编辑</el-button>
                <el-button link type="danger" @click="deleteDish(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!dishes.length" description="暂无菜品，请先保存餐厅信息后新增" />
        </el-tab-pane>

        <!-- 时段 -->
        <el-tab-pane label="时段管理" name="slots">
          <div class="toolbar">
            <el-button type="success" @click="openSlot()">新增时段</el-button>
          </div>
          <el-table :data="slots" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="slotName" label="时段" width="220" />
            <el-table-column prop="maxBooking" label="每时段可订数" width="120" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button link type="primary" @click="openSlot(row)">编辑</el-button>
                <el-button link type="danger" @click="deleteSlot(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!slots.length" description="暂无时段" />
        </el-tab-pane>

        <!-- 预订 -->
        <el-tab-pane label="预订管理" name="bookings">
          <div class="toolbar">
            <el-select v-model="bookingStatus" placeholder="全部状态" clearable class="select" @change="loadBookings(1)">
              <el-option v-for="(t, s) in statusTexts" :key="s" :label="t" :value="Number(s)" />
            </el-select>
            <el-button type="primary" @click="loadBookings(1)">查询</el-button>
          </div>
          <el-table :data="bookings" border>
            <el-table-column prop="orderNo" label="订单号" width="170" />
            <el-table-column prop="bookingDate" label="用餐日期" width="110">
              <template #default="{ row }">{{ String(row.bookingDate).slice(0, 10) }}</template>
            </el-table-column>
            <el-table-column prop="guestCount" label="人数" width="70" />
            <el-table-column prop="contactName" label="联系人" width="100" />
            <el-table-column prop="contactPhone" label="联系电话" width="130" />
            <el-table-column prop="totalAmount" label="金额" width="90" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'warning' : 'info'" size="small">{{ statusTexts[row.status] || `状态${row.status}` }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <template v-if="row.status === 1">
                  <el-button link type="success" @click="handleBooking(row, true)">确认</el-button>
                  <el-button link type="danger" @click="handleBooking(row, false)">拒绝</el-button>
                </template>
                <span v-else class="muted">-</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="bookingTotal"
            :page-size="10"
            :current-page="bookingPage"
            class="pager"
            @current-change="loadBookings"
          />
        </el-tab-pane>

        <!-- 农产品 -->
        <el-tab-pane label="农产品" name="farm">
          <div class="toolbar">
            <el-input v-model="farmKeyword" placeholder="搜索农产品" class="search" clearable @keyup.enter="loadFarm(1)" />
            <el-button type="primary" @click="loadFarm(1)">查询</el-button>
            <el-button type="success" @click="openFarm()">新增农产品</el-button>
          </div>
          <el-table :data="farms" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="price" label="价格" width="90" />
            <el-table-column prop="spec" label="规格" width="110" />
            <el-table-column prop="stock" label="库存" width="80" />
            <el-table-column prop="sales" label="销量" width="80" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '上架中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button link type="primary" @click="openFarm(row)">编辑</el-button>
                <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleFarm(row)">{{ row.status === 1 ? '下架' : '上架' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="farmTotal"
            :page-size="10"
            :current-page="farmPage"
            class="pager"
            @current-change="loadFarm"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 菜品弹窗 -->
    <el-dialog v-model="dishDialog" :title="dishForm.id ? '编辑菜品' : '新增菜品'" width="480px">
      <el-form label-width="80px">
        <el-form-item label="菜名"><el-input v-model="dishForm.name" /></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="dishForm.price" :min="0" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="dishForm.mainImage" placeholder="http://..." /></el-form-item>
        <el-form-item label="介绍"><el-input v-model="dishForm.intro" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="招牌菜"><el-switch v-model="dishForm.isSignature" :active-value="1" :inactive-value="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="dishForm.status" :active-value="1" :inactive-value="0" active-text="上架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dishDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDish">保存</el-button>
      </template>
    </el-dialog>

    <!-- 时段弹窗 -->
    <el-dialog v-model="slotDialog" :title="slotForm.id ? '编辑时段' : '新增时段'" width="420px">
      <el-form label-width="120px">
        <el-form-item label="时段名称"><el-input v-model="slotForm.slotName" placeholder="如 午餐 11:30-13:30" /></el-form-item>
        <el-form-item label="每时段可订数"><el-input-number v-model="slotForm.maxBooking" :min="1" controls-position="right" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="slotForm.status" :active-value="1" :inactive-value="0" active-text="启用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="slotDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSlot">保存</el-button>
      </template>
    </el-dialog>

    <!-- 农产品弹窗 -->
    <el-dialog v-model="farmDialog" :title="farmForm.id ? '编辑农产品' : '新增农产品'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="名称"><el-input v-model="farmForm.name" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="farmForm.categoryId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in farmCats" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格"><el-input-number v-model="farmForm.price" :min="0" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="规格"><el-input v-model="farmForm.spec" placeholder="如 500g/箱" /></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="farmForm.stock" :min="0" controls-position="right" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="farmForm.mainImage" placeholder="http://..." /></el-form-item>
        <el-form-item label="产地"><el-input v-model="farmForm.origin" /></el-form-item>
        <el-form-item label="保质期"><el-input v-model="farmForm.shelfLife" placeholder="如 常温 30 天" /></el-form-item>
        <el-form-item label="运费"><el-input-number v-model="farmForm.freight" :min="0" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="详情"><el-input v-model="farmForm.detail" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="farmForm.status" :active-value="1" :inactive-value="0" active-text="上架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="farmDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFarm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';

const tab = ref('restaurant');

// 餐厅
const restForm = reactive<any>({ name: '', address: '', openTime: '11:00-21:00', capacity: 50, mainImage: '', intro: '' });

// 菜品
const dishes = ref<any[]>([]);
const dishDialog = ref(false);
const dishForm = reactive<any>({});

// 时段
const slots = ref<any[]>([]);
const slotDialog = ref(false);
const slotForm = reactive<any>({});

// 预订
const bookingStatus = ref('');
const bookings = ref<any[]>([]);
const bookingTotal = ref(0);
const bookingPage = ref(1);

// 农产品
const farmKeyword = ref('');
const farms = ref<any[]>([]);
const farmTotal = ref(0);
const farmPage = ref(1);
const farmCats = ref<any[]>([]);
const farmDialog = ref(false);
const farmForm = reactive<any>({});

const statusTexts: Record<number, string> = {
  0: '待支付', 1: '已支付', 2: '已确认', 3: '进行中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款',
};

async function loadRestaurant() {
  try {
    const r: any = await request.get('/merchant/food/restaurant');
    if (r) {
      Object.assign(restForm, {
        name: r.name, address: r.address, openTime: r.openTime, capacity: r.capacity,
        mainImage: r.mainImage, intro: r.intro || '',
      });
    }
  } catch {
    // 已提示
  }
}

async function saveRestaurant() {
  if (!restForm.name || !restForm.address) {
    ElMessage.warning('请填写餐厅名称和地址');
    return;
  }
  try {
    await request.post('/merchant/food/restaurant/save', restForm);
    ElMessage.success('已保存');
  } catch {
    // 已提示
  }
}

async function loadDishes() {
  try {
    dishes.value = await request.get('/merchant/food/dishes');
  } catch {
    // 已提示
  }
}

function openDish(row?: any) {
  Object.assign(dishForm, row
    ? { id: row.id, name: row.name, price: Number(row.price), mainImage: row.mainImage, intro: row.intro, isSignature: row.isSignature, status: row.status }
    : { id: undefined, name: '', price: 0, mainImage: '', intro: '', isSignature: 0, status: 1 });
  dishDialog.value = true;
}

async function saveDish() {
  if (!dishForm.name) {
    ElMessage.warning('请填写菜名');
    return;
  }
  try {
    await request.post('/merchant/food/dishes/save', dishForm);
    ElMessage.success('已保存');
    dishDialog.value = false;
    loadDishes();
  } catch {
    // 已提示
  }
}

async function deleteDish(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除菜品「${row.name}」？`, '提示', { type: 'warning' });
    await request.post(`/merchant/food/dishes/${row.id}/delete`);
    ElMessage.success('已删除');
    loadDishes();
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadSlots() {
  try {
    slots.value = await request.get('/merchant/food/slots');
  } catch {
    // 已提示
  }
}

function openSlot(row?: any) {
  Object.assign(slotForm, row
    ? { id: row.id, slotName: row.slotName, maxBooking: row.maxBooking, status: row.status }
    : { id: undefined, slotName: '', maxBooking: 20, status: 1 });
  slotDialog.value = true;
}

async function saveSlot() {
  if (!slotForm.slotName) {
    ElMessage.warning('请填写时段名称');
    return;
  }
  try {
    await request.post('/merchant/food/slots/save', slotForm);
    ElMessage.success('已保存');
    slotDialog.value = false;
    loadSlots();
  } catch {
    // 已提示
  }
}

async function deleteSlot(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除时段「${row.slotName}」？`, '提示', { type: 'warning' });
    await request.post(`/merchant/food/slots/${row.id}/delete`);
    ElMessage.success('已删除');
    loadSlots();
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadBookings(p = 1) {
  bookingPage.value = p;
  try {
    const data: any = await request.get('/merchant/food/bookings', {
      params: { status: bookingStatus.value || undefined, page: bookingPage.value, pageSize: 10 },
    });
    bookings.value = data.list || [];
    bookingTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function handleBooking(row: any, accept: boolean) {
  const tip = accept ? '确认该预订？确认后顾客将收到通知。' : '拒绝该预订将取消订单并释放余量，确定？';
  try {
    let rejectReason = '';
    if (!accept) {
      const r = await ElMessageBox.prompt(tip, '拒绝预订', { inputPlaceholder: '拒绝原因（选填）' });
      rejectReason = r.value || '';
    } else {
      await ElMessageBox.confirm(tip, '提示', { type: 'warning' });
    }
    // 注意：后端 orderId 从 query 取，路径占位符需提供但无实际作用
    await request.post(`/merchant/food/bookings/${row.orderId}/handle`, { accept, rejectReason }, { params: { orderId: row.orderId } });
    ElMessage.success(accept ? '已确认' : '已拒绝');
    loadBookings(bookingPage.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadFarm(p = 1) {
  farmPage.value = p;
  try {
    const data: any = await request.get('/merchant/food/farm/products', {
      params: { keyword: farmKeyword.value || undefined, page: farmPage.value, pageSize: 10 },
    });
    farms.value = data.list || [];
    farmTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function loadFarmCats() {
  try {
    farmCats.value = await request.get('/food/farm/categories');
  } catch {
    // 已提示
  }
}

function openFarm(row?: any) {
  Object.assign(farmForm, row
    ? {
        id: row.id, name: row.name, categoryId: row.categoryId, price: Number(row.price), spec: row.spec,
        stock: row.stock, mainImage: row.mainImage, origin: row.origin, shelfLife: row.shelfLife,
        freight: Number(row.freight), detail: row.detail || '', status: row.status,
      }
    : {
        id: undefined, name: '', categoryId: undefined, price: 0, spec: '', stock: 0, mainImage: '',
        origin: '', shelfLife: '', freight: 0, detail: '', status: 1,
      });
  farmDialog.value = true;
}

async function saveFarm() {
  if (!farmForm.name || !farmForm.categoryId) {
    ElMessage.warning('请填写名称并选择分类');
    return;
  }
  try {
    await request.post('/merchant/food/farm/products/save', farmForm);
    ElMessage.success('已保存');
    farmDialog.value = false;
    loadFarm(farmPage.value);
  } catch {
    // 已提示
  }
}

async function toggleFarm(row: any) {
  try {
    await request.post(`/merchant/food/farm/products/${row.id}/toggle`);
    ElMessage.success('已切换');
    loadFarm(farmPage.value);
  } catch {
    // 已提示
  }
}

function reload() {
  if (tab.value === 'restaurant') loadRestaurant();
  if (tab.value === 'dishes') loadDishes();
  if (tab.value === 'slots') loadSlots();
  if (tab.value === 'bookings') loadBookings(1);
  if (tab.value === 'farm') loadFarm(1);
}

onMounted(() => {
  loadRestaurant();
  loadDishes();
  loadSlots();
  loadBookings(1);
  loadFarm(1);
  loadFarmCats();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.search {
  width: 200px;
}
.select {
  width: 140px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.muted {
  color: #999;
  font-size: 12px;
}
.rest-form {
  max-width: 560px;
}
</style>
