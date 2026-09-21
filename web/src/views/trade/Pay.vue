<template>
  <div>
    <TopNav />
    <div class="page" v-if="payInfo">
      <div class="pay-card">
        <h3>收银台（模拟微信支付）</h3>
        <div class="line">订单号：{{ payInfo.orderNo }}</div>
        <div class="amount">应付金额 <span class="red">¥{{ payInfo.amount }}</span></div>

        <!-- 模拟二维码 -->
        <div class="qrcode">
          <div class="qr-grid">
            <div v-for="i in 144" :key="i" class="qr-cell" :class="{ dark: qrPattern[i % qrPattern.length] === '1' }" />
          </div>
        </div>
        <div class="qr-tip">微信扫码支付（演示环境，点击下方按钮模拟扫码）</div>
        <div class="qr-content">{{ payInfo.qrcodeContent }}</div>

        <el-button type="success" size="large" :loading="paying" @click="mockScan">模拟扫码支付</el-button>
        <el-button size="large" @click="$router.push('/orders')">暂不支付</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const route = useRoute();
const router = useRouter();
const payInfo = ref<any>(null);
const paying = ref(false);
// 固定伪随机二维码图案（仅装饰）
const qrPattern = '1010011101010110010110100101101001011010010110100101101110010110100101101001011010010110100101101110010110100101101001011010010110100101';

async function init() {
  try {
    const st: any = await request.get('/pay/status', { params: { orderId: route.params.orderId } });
    if (st.paid) {
      ElMessage.info('该订单已支付');
      router.replace('/orders');
      return;
    }
    payInfo.value = await request.post('/pay/create', null, { params: { orderId: route.params.orderId } });
  } catch {
    // 已提示，回订单页
    router.replace('/orders');
  }
}

async function mockScan() {
  paying.value = true;
  try {
    await request.post('/pay/mock-scan', null, { params: { payNo: payInfo.value.payNo } });
    ElMessage.success('支付成功');
    router.replace('/orders');
  } catch {
    // 已提示
  } finally {
    paying.value = false;
  }
}

onMounted(init);
</script>

<style scoped>
.page {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}
.pay-card {
  width: 420px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 28px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}
.line {
  color: #666;
  margin-top: 10px;
  font-size: 13px;
}
.amount {
  margin-top: 12px;
  font-size: 16px;
}
.red {
  color: #c0392b;
  font-size: 26px;
  font-weight: bold;
}
.qrcode {
  width: 180px;
  height: 180px;
  margin: 20px auto 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
}
.qr-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1px;
  width: 100%;
  height: 100%;
}
.qr-cell {
  background: #fff;
}
.qr-cell.dark {
  background: #222;
}
.qr-tip {
  font-size: 12px;
  color: #999;
}
.qr-content {
  font-size: 11px;
  color: #bbb;
  margin: 6px 0 16px;
  word-break: break-all;
}
</style>
