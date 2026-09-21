<template>
  <div>
    <TopNav />
    <div class="page">
      <h2>购物车</h2>
      <el-empty v-if="!list.length" description="购物车还是空的，去逛逛吧" />

      <template v-else>
        <div v-for="item in list" :key="item.id" class="row">
          <el-checkbox v-model="checkedMap[item.id]" :disabled="item.invalid || item.stockNotEnough" />
          <img :src="item.image" class="row-img" />
          <div class="row-main">
            <div class="row-title">{{ item.title }}</div>
            <div class="row-spec">{{ item.specName }}</div>
            <div class="row-warn">
              <el-tag v-if="item.invalid" type="danger" size="small">已失效</el-tag>
              <el-tag v-else-if="item.stockNotEnough" type="warning" size="small">库存不足（仅剩 {{ item.stock }}）</el-tag>
            </div>
          </div>
          <div class="row-price">¥{{ item.price }}</div>
          <el-input-number v-model="item.quantity" :min="1" :max="item.stock || 99" size="small" @change="changeQty(item)" />
          <el-button link type="danger" @click="removeItem(item)">删除</el-button>
        </div>

        <div class="footer">
          <el-checkbox v-model="checkAll" @change="toggleAll">全选</el-checkbox>
          <div class="footer-right">
            已选 {{ checkedIds.length }} 件，合计 <span class="red">¥{{ totalAmount.toFixed(2) }}</span>
            <el-button type="danger" size="large" :disabled="!checkedIds.length" :loading="checkingOut" @click="checkout">
              结算
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const router = useRouter();
const list = ref<any[]>([]);
const checkedMap = reactive<Record<number, boolean>>({});
const checkAll = ref(false);
const checkingOut = ref(false);

const checkedIds = computed(() => list.value.filter(i => checkedMap[i.id]).map(i => i.id));
const totalAmount = computed(() =>
  list.value.filter(i => checkedMap[i.id]).reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)
);

async function load() {
  try {
    list.value = await request.get('/cart/');
    list.value.forEach(i => {
      // 无效或库存不足的条目默认不勾选；数量超过库存时修正
      if (checkedMap[i.id] === undefined) {
        checkedMap[i.id] = !i.invalid && !i.stockNotEnough;
      }
      if (i.stock && i.quantity > i.stock) {
        i.quantity = i.stock;
      }
    });
    window.dispatchEvent(new Event('cart-changed'));
  } catch {
    // 已提示
  }
}

function toggleAll(v: boolean) {
  list.value.forEach(i => {
    if (!i.invalid && !i.stockNotEnough) {
      checkedMap[i.id] = v;
    }
  });
}

async function changeQty(item: any) {
  try {
    list.value = await request.put(`/cart/${item.id}`, { quantity: item.quantity });
    window.dispatchEvent(new Event('cart-changed'));
  } catch {
    // 已提示
  }
}

async function removeItem(item: any) {
  try {
    await ElMessageBox.confirm(`确定移除「${item.title}」？`, '提示', { type: 'warning' });
    list.value = await request.post(`/cart/${item.id}/remove`);
    delete checkedMap[item.id];
    window.dispatchEvent(new Event('cart-changed'));
  } catch (e: any) {
    // 取消删除或已提示
  }
}

async function checkout() {
  if (!checkedIds.value.length) {
    ElMessage.warning('请先勾选要结算的商品');
    return;
  }
  checkingOut.value = true;
  try {
    const orders: any[] = await request.post('/cart/checkout', { cartIds: checkedIds.value });
    window.dispatchEvent(new Event('cart-changed'));
    if (orders.length === 1) {
      router.push(`/pay/${orders[0].id}`);
    } else {
      ElMessage.success(`已按商家拆分为 ${orders.length} 个订单`);
      router.push('/orders?status=0');
    }
  } catch {
    // 已提示
  } finally {
    checkingOut.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-top: 12px;
}
.row-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}
.row-main {
  flex: 1;
}
.row-title {
  font-weight: 600;
}
.row-spec {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.row-warn {
  margin-top: 4px;
}
.row-price {
  color: #c0392b;
  font-weight: bold;
  width: 80px;
  text-align: right;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 14px;
  background: #fafafa;
  border-radius: 8px;
}
.footer-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.red {
  color: #c0392b;
  font-size: 20px;
  font-weight: bold;
}
</style>
