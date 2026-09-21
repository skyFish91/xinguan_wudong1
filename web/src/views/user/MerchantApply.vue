<template>
  <div>
    <TopNav />
    <div class="page">
      <h2>商家入驻申请</h2>

      <!-- 已有申请 -->
      <div v-if="applies.length" class="apply-status">
        <el-divider content-position="left">我的申请记录</el-divider>
        <div v-for="a in applies" :key="a.id" class="apply-row">
          <div>{{ a.shopName }}（{{ moduleText(a.moduleType) }}）</div>
          <el-tag :type="a.status === 1 ? 'success' : a.status === 2 ? 'danger' : 'warning'" size="small">
            {{ a.status === 0 ? '审核中' : a.status === 1 ? '已通过' : '已驳回' }}
          </el-tag>
          <div v-if="a.rejectReason" class="reject">驳回原因：{{ a.rejectReason }}</div>
        </div>
      </div>

      <el-form :model="form" label-width="110px" class="form">
        <el-form-item label="店铺名称">
          <el-input v-model="form.shopName" class="input" placeholder="如：乌东苗绣坊" />
        </el-form-item>
        <el-form-item label="经营模块">
          <el-select v-model="form.moduleType" class="input">
            <el-option label="衣 · 非遗好物" value="clothing" />
            <el-option label="食 · 餐饮美食" value="food" />
            <el-option label="住 · 民宿住宿" value="hotel" />
            <el-option label="行 · 线路订票" value="travel" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" class="input" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" class="input" />
        </el-form-item>
        <el-form-item label="营业执照号">
          <el-input v-model="form.licenseNo" class="input" />
        </el-form-item>
        <el-form-item label="补充材料">
          <el-input v-model="form.materials" type="textarea" :rows="3" placeholder="其他资质说明（选填）" class="input" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
          <el-button @click="$router.back()">返回</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const router = useRouter();
const applies = ref<any[]>([]);
const submitting = ref(false);
const form = reactive({
  shopName: '',
  moduleType: 'clothing',
  contact: '',
  contactPhone: '',
  licenseNo: '',
  materials: '',
});

function moduleText(m: string) {
  const map: Record<string, string> = { clothing: '衣·非遗好物', food: '食·餐饮美食', hotel: '住·民宿住宿', travel: '行·线路订票' };
  return map[m] || m;
}

async function loadApplies() {
  try {
    applies.value = await request.get('/merchant/my-apply');
  } catch {
    // 已提示
  }
}

async function submit() {
  if (!form.shopName.trim() || !form.contact.trim() || !form.contactPhone.trim() || !form.licenseNo.trim()) {
    ElMessage.warning('请填写完整申请信息');
    return;
  }
  submitting.value = true;
  try {
    await request.post('/merchant/apply', { ...form });
    ElMessage.success('申请已提交，请等待平台审核');
    router.push('/user');
  } catch {
    // 已提示
  } finally {
    submitting.value = false;
  }
}

onMounted(loadApplies);
</script>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px;
}
.form {
  margin-top: 20px;
}
.input {
  max-width: 380px;
}
.apply-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.reject {
  color: #c0392b;
  font-size: 12px;
}
</style>
