<template>
  <div>
    <el-card>
      <el-tabs v-model="tab" @tab-change="reload">
        <!-- 账单明细 -->
        <el-tab-pane label="账单明细" name="records">
          <div class="toolbar">
            <el-input v-model="merchantId" placeholder="商家ID（1衣/2食/3住/4行）" class="select" clearable @keyup.enter="loadRecords(1)" />
            <el-select v-model="settleStatus" placeholder="结算状态" clearable class="select" @change="loadRecords(1)">
              <el-option label="未结算" value="0" />
              <el-option label="已结算" value="1" />
            </el-select>
            <el-button type="primary" @click="loadRecords(1)">查询</el-button>
            <el-button type="success" @click="generate">生成结算单（T+7）</el-button>
          </div>
          <el-table :data="records" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="orderId" label="订单ID" width="90" />
            <el-table-column prop="merchantId" label="商家ID" width="90" />
            <el-table-column prop="orderAmount" label="订单金额" width="110" />
            <el-table-column label="佣金率" width="90">
              <template #default="{ row }">{{ row.commissionRate }}%</template>
            </el-table-column>
            <el-table-column prop="commission" label="平台佣金" width="110" />
            <el-table-column prop="merchantIncome" label="商家收入" width="110" />
            <el-table-column label="结算状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.settleStatus === 1 ? 'success' : 'warning'" size="small">{{ row.settleStatus === 1 ? '已结算' : '未结算' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="settleNo" label="结算单号" width="170" />
            <el-table-column label="记账时间" width="160">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="recordTotal"
            :page-size="10"
            :current-page="recordPage"
            class="pager"
            @current-change="loadRecords"
          />
        </el-tab-pane>

        <!-- 结算单 -->
        <el-tab-pane label="结算单" name="settlements">
          <div class="toolbar">
            <el-select v-model="sStatus" placeholder="全部状态" clearable class="select" @change="loadSettlements(1)">
              <el-option label="待打款" value="0" />
              <el-option label="已打款" value="1" />
            </el-select>
            <el-button type="primary" @click="loadSettlements(1)">查询</el-button>
          </div>
          <el-table :data="settlements" border>
            <el-table-column prop="settleNo" label="结算单号" width="190" />
            <el-table-column prop="shopName" label="商家" width="160" />
            <el-table-column prop="amount" label="结算金额" width="110" />
            <el-table-column label="结算周期" width="220">
              <template #default="{ row }">{{ row.periodStart }} ~ {{ row.periodEnd }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'warning'" size="small">{{ row.status === 1 ? '已打款' : '待打款' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="生成时间" width="160">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button v-if="row.status === 0" link type="success" @click="confirmSettle(row)">确认打款</el-button>
                <span v-else class="muted">-</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="settleTotal"
            :page-size="10"
            :current-page="settlePage"
            class="pager"
            @current-change="loadSettlements"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const tab = ref('records');

// 账单
const merchantId = ref('');
const settleStatus = ref('');
const records = ref<any[]>([]);
const recordTotal = ref(0);
const recordPage = ref(1);

// 结算单
const sStatus = ref('');
const settlements = ref<any[]>([]);
const settleTotal = ref(0);
const settlePage = ref(1);

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

async function loadRecords(p = 1) {
  recordPage.value = p;
  try {
    const data: any = await request.get('/admin/finances', {
      params: {
        merchantId: merchantId.value || undefined,
        settleStatus: settleStatus.value || undefined,
        page: recordPage.value,
        pageSize: 10,
      },
    });
    records.value = data.list || [];
    recordTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function generate() {
  try {
    await ElMessageBox.confirm('将满 T+7 周期的未结算记录按商家汇总生成结算单，确定？', '提示', { type: 'warning' });
    const data: any = await request.post('/admin/settlements/generate');
    ElMessage.success(data.message || `已生成 ${data.generated} 张结算单`);
    loadRecords(recordPage.value);
    loadSettlements(settlePage.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadSettlements(p = 1) {
  settlePage.value = p;
  try {
    const data: any = await request.get('/admin/settlements', {
      params: { status: sStatus.value || undefined, page: settlePage.value, pageSize: 10 },
    });
    settlements.value = data.list || [];
    settleTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function confirmSettle(row: any) {
  try {
    await ElMessageBox.confirm(`确定向「${row.shopName}」打款 ${row.amount} 元？`, '提示', { type: 'warning' });
    await request.post(`/admin/settlements/${row.id}/confirm`);
    ElMessage.success('已确认打款');
    loadSettlements(settlePage.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

function reload() {
  if (tab.value === 'records') loadRecords(1);
  if (tab.value === 'settlements') loadSettlements(1);
}

onMounted(() => {
  loadRecords(1);
  loadSettlements(1);
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.select {
  width: 200px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.muted {
  color: #999;
  font-size: 12px;
}
</style>
