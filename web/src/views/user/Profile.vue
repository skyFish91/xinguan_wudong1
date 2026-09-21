<template>
  <div>
    <TopNav />
    <div class="page">
      <h2>个人中心</h2>
      <el-tabs v-model="tab">
        <!-- 资料 -->
        <el-tab-pane label="我的资料" name="profile">
          <el-form :model="profileForm" label-width="90px" class="form">
            <el-form-item label="手机号">{{ profile.phone }}</el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="profileForm.nickname" class="input" />
            </el-form-item>
            <el-form-item label="头像URL">
              <el-input v-model="profileForm.avatar" placeholder="图片地址，选填" class="input" />
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="profileForm.gender">
                <el-radio :value="0">保密</el-radio>
                <el-radio :value="1">男</el-radio>
                <el-radio :value="2">女</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="地区">
              <el-input v-model="profileForm.region" placeholder="如：贵州·乌东" class="input" />
            </el-form-item>
            <el-form-item label="简介">
              <el-input v-model="profileForm.bio" type="textarea" :rows="3" maxlength="500" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveProfile">保存资料</el-button>
              <span v-if="profile.role === 'merchant'" class="merchant-tag">
                <el-tag type="warning">已入驻商家</el-tag>
                <el-button link type="primary" @click="shopDialog = true; loadShop()">店铺信息</el-button>
              </span>
              <el-button v-else link type="primary" @click="$router.push('/user/apply-merchant')">申请成为商家</el-button>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">修改密码</el-divider>
          <el-form :model="pwdForm" label-width="90px" class="form">
            <el-form-item label="原密码">
              <el-input v-model="pwdForm.oldPassword" type="password" class="input" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="pwdForm.newPassword" type="password" placeholder="8-20位，含字母和数字" class="input" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="savePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 地址 -->
        <el-tab-pane label="收货地址" name="address">
          <el-button type="primary" size="small" class="add-btn" @click="openAddress()">新增地址</el-button>
          <div v-for="a in addresses" :key="a.id" class="addr">
            <div>
              {{ a.receiver }} {{ a.phone }} · {{ a.province }}{{ a.city }}{{ a.district }}{{ a.detail }}
              <el-tag v-if="a.isDefault" size="small" type="danger">默认</el-tag>
            </div>
            <div class="addr-ops">
              <el-button link type="primary" size="small" @click="openAddress(a)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteAddress(a)">删除</el-button>
            </div>
          </div>
          <el-empty v-if="!addresses.length" description="暂无收货地址" />
        </el-tab-pane>

        <!-- 消息 -->
        <el-tab-pane label="消息通知" name="message">
          <el-button link type="primary" size="small" @click="markAllRead">全部标为已读</el-button>
          <div v-for="m in messages" :key="m.id" class="msg" :class="{ unread: !m.isRead }">
            <div class="msg-head">
              <span class="msg-title">{{ m.title }}</span>
              <span class="msg-time">{{ formatTime(m.createdAt) }}</span>
            </div>
            <div class="msg-content">{{ m.content }}</div>
          </div>
          <el-empty v-if="!messages.length" description="暂无消息" />
        </el-tab-pane>

        <!-- 收藏 -->
        <el-tab-pane label="我的收藏" name="favorite">
          <h4>商品收藏</h4>
          <div class="fav-grid">
            <div v-for="f in favProducts" :key="f.id" class="fav-item" @click="$router.push(`/clothing/${f.id}`)">
              <img :src="f.mainImage" class="fav-img" />
              <div class="fav-title">{{ f.title }}</div>
              <div class="fav-price">¥{{ f.price }}</div>
            </div>
          </div>
          <el-empty v-if="!favProducts.length" description="暂无商品收藏" />

          <h4 style="margin-top: 32px;">游记收藏</h4>
          <div class="posts-grid">
            <div v-for="p in favPosts" :key="p.id" class="post-card" @click="$router.push(`/community/${p.id}`)">
              <img v-if="getFirstImage(p)" :src="getFirstImage(p)" class="post-cover" />
              <div class="post-cover-placeholder" v-else>
                <el-icon :size="40"><Picture /></el-icon>
              </div>
              <div class="post-content">
                <div class="post-title">{{ p.title }}</div>
                <div class="post-meta">
                  <span><el-icon><View /></el-icon> {{ p.viewCount }}</span>
                  <span><el-icon><Star /></el-icon> {{ p.likeCount }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-if="!favPosts.length" description="暂无游记收藏" />
        </el-tab-pane>

        <!-- 我的游记 -->
        <el-tab-pane label="我的游记" name="posts">
          <div class="posts-grid">
            <div v-for="p in myPosts" :key="p.id" class="post-card">
              <div class="post-status">
                <el-tag v-if="p.status === 0" size="small" type="warning">待审核</el-tag>
                <el-tag v-else-if="p.status === 2" size="small" type="danger">已驳回</el-tag>
                <el-tag v-else size="small" type="success">已发布</el-tag>
              </div>
              <img v-if="getFirstImage(p)" :src="getFirstImage(p)" class="post-cover" @click="$router.push(`/community/${p.id}`)" />
              <div class="post-cover-placeholder" v-else @click="$router.push(`/community/${p.id}`)">
                <el-icon :size="40"><Picture /></el-icon>
              </div>
              <div class="post-content">
                <div class="post-title" @click="$router.push(`/community/${p.id}`)">{{ p.title }}</div>
                <div class="post-meta">
                  <span>{{ formatTime(p.createdAt) }}</span>
                  <span><el-icon><Star /></el-icon> {{ p.likeCount }}</span>
                  <span><el-icon><ChatDotRound /></el-icon> {{ p.commentCount }}</span>
                </div>
                <div class="post-actions">
                  <el-button link type="danger" size="small" @click="deletePost(p)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-if="!myPosts.length" description="还没有发布过游记" />
        </el-tab-pane>
      </el-tabs>

      <!-- 地址弹窗 -->
      <el-dialog v-model="addressDialog" :title="addressForm.id ? '编辑地址' : '新增地址'" width="480px">
        <el-form :model="addressForm" label-width="80px">
          <el-form-item label="收货人"><el-input v-model="addressForm.receiver" /></el-form-item>
          <el-form-item label="手机号"><el-input v-model="addressForm.phone" /></el-form-item>
          <el-form-item label="省份"><el-input v-model="addressForm.province" /></el-form-item>
          <el-form-item label="城市"><el-input v-model="addressForm.city" /></el-form-item>
          <el-form-item label="区县"><el-input v-model="addressForm.district" /></el-form-item>
          <el-form-item label="详细地址"><el-input v-model="addressForm.detail" /></el-form-item>
          <el-form-item label="默认地址"><el-switch v-model="addressForm.isDefault" :active-value="1" :inactive-value="0" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addressDialog = false">取消</el-button>
          <el-button type="primary" @click="saveAddress">保存</el-button>
        </template>
      </el-dialog>

      <!-- 店铺信息弹窗 -->
      <el-dialog v-model="shopDialog" title="店铺信息" width="480px">
        <el-form :model="shopForm" label-width="80px">
          <el-form-item label="店铺名"><el-input v-model="shopForm.shopName" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="shopForm.contact" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="shopForm.contactPhone" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="shopDialog = false">取消</el-button>
          <el-button type="primary" @click="saveShop">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Picture, View, Star, ChatDotRound, Delete } from '@element-plus/icons-vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';
import { useUserStore } from '../../stores/user';

const userStore = useUserStore();
const tab = ref('profile');
const profile = ref<any>({});
const profileForm = reactive({ nickname: '', avatar: '', gender: 0, region: '', bio: '' });
const pwdForm = reactive({ oldPassword: '', newPassword: '' });

const addresses = ref<any[]>([]);
const addressDialog = ref(false);
const addressForm = reactive<any>({ id: 0, receiver: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: 0 });

const messages = ref<any[]>([]);
const favProducts = ref<any[]>([]);
const favPosts = ref<any[]>([]);
const myPosts = ref<any[]>([]);

const shopDialog = ref(false);
const shopForm = reactive({ shopName: '', contact: '', contactPhone: '' });

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

function getFirstImage(post: any) {
  if (!post.images) return '';
  try {
    const imgs = Array.isArray(post.images) ? post.images : JSON.parse(post.images || '[]');
    return imgs[0] || '';
  } catch {
    return '';
  }
}

async function loadProfile() {
  try {
    profile.value = await request.get('/auth/profile');
    profileForm.nickname = profile.value.nickname || '';
    profileForm.avatar = profile.value.avatar || '';
    profileForm.gender = profile.value.gender ?? 0;
    profileForm.region = profile.value.region || '';
    profileForm.bio = profile.value.bio || '';
    userStore.setUserInfo(profile.value);
  } catch {
    // 已提示
  }
}

async function saveProfile() {
  try {
    await request.put('/auth/profile', { ...profileForm });
    ElMessage.success('资料已保存');
    loadProfile();
  } catch {
    // 已提示
  }
}

async function savePassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    ElMessage.warning('请填写完整');
    return;
  }
  try {
    await request.put('/auth/password', { ...pwdForm });
    ElMessage.success('密码已修改');
    pwdForm.oldPassword = '';
    pwdForm.newPassword = '';
  } catch {
    // 已提示
  }
}

async function loadAddresses() {
  try {
    addresses.value = await request.get('/user/addresses');
  } catch {
    // 已提示
  }
}

function openAddress(a?: any) {
  Object.assign(addressForm, a || { id: 0, receiver: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: 0 });
  addressDialog.value = true;
}

async function saveAddress() {
  if (!addressForm.receiver || !addressForm.phone || !addressForm.province || !addressForm.city || !addressForm.district || !addressForm.detail) {
    ElMessage.warning('请填写完整地址信息');
    return;
  }
  try {
    if (addressForm.id) {
      await request.put(`/user/addresses/${addressForm.id}`, { ...addressForm });
    } else {
      await request.post('/user/addresses', { ...addressForm });
    }
    ElMessage.success('已保存');
    addressDialog.value = false;
    loadAddresses();
  } catch {
    // 已提示
  }
}

async function deleteAddress(a: any) {
  try {
    await ElMessageBox.confirm('确定删除该地址？', '提示', { type: 'warning' });
    await request.post(`/user/addresses/${a.id}/delete`);
    loadAddresses();
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadMessages() {
  try {
    const data: any = await request.get('/messages/', { params: { page: 1, pageSize: 50 } });
    messages.value = data.list || [];
  } catch {
    // 已提示
  }
}

async function markAllRead() {
  try {
    await request.post('/messages/read');
    ElMessage.success('已全部标为已读');
    loadMessages();
  } catch {
    // 已提示
  }
}

async function loadFavorites() {
  try {
    favProducts.value = await request.get('/clothing/favorites');
  } catch {
    // 已提示
  }
  try {
    favPosts.value = await request.get('/community/my/favorites');
  } catch {
    // 已提示
  }
}

async function loadMyPosts() {
  try {
    myPosts.value = await request.get('/community/my/posts');
  } catch {
    // 已提示
  }
}

async function deletePost(p: any) {
  try {
    await ElMessageBox.confirm('确定删除该游记？', '提示', { type: 'warning' });
    await request.post(`/community/my/posts/${p.id}/delete`);
    ElMessage.success('已删除');
    loadMyPosts();
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadShop() {
  try {
    const shop: any = await request.get('/merchant/my-shop');
    shopForm.shopName = shop.shopName || '';
    shopForm.contact = shop.contact || '';
    shopForm.contactPhone = shop.contactPhone || '';
  } catch {
    // 已提示
  }
}

async function saveShop() {
  try {
    await request.put('/merchant/my-shop', { ...shopForm });
    ElMessage.success('店铺信息已保存');
    shopDialog.value = false;
  } catch {
    // 已提示
  }
}

onMounted(() => {
  loadProfile();
  loadAddresses();
  loadMessages();
  loadFavorites();
  loadMyPosts();
});
</script>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}
.form {
  max-width: 520px;
}
.input {
  max-width: 320px;
}
.merchant-tag {
  margin-left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.add-btn {
  margin-bottom: 12px;
}
.addr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 10px;
}
.addr-ops {
  flex-shrink: 0;
}
.msg {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.msg.unread .msg-title {
  font-weight: bold;
}
.msg-head {
  display: flex;
  justify-content: space-between;
}
.msg-time {
  color: #999;
  font-size: 12px;
}
.msg-content {
  margin-top: 6px;
  color: #666;
  font-size: 13px;
}

/* 商品收藏 */
.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.fav-item {
  cursor: pointer;
  transition: transform 0.3s;
}
.fav-item:hover {
  transform: translateY(-4px);
}
.fav-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}
.fav-title {
  font-size: 14px;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}
.fav-price {
  font-size: 16px;
  font-weight: 600;
  color: #c0392b;
  margin-top: 4px;
}

/* 游记卡片 */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.post-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border-color: #667eea;
}

.post-status {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.post-cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s;
}

.post-card:hover .post-cover {
  transform: scale(1.05);
}

.post-cover-placeholder {
  width: 100%;
  height: 180px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  cursor: pointer;
}

.post-content {
  padding: 16px;
}

.post-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
  line-height: 1.5;
}

.post-title:hover {
  color: #667eea;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.post-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }

  .fav-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style>
