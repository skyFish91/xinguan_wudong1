<template>
  <div>
    <el-card>
      <el-tabs v-model="tab" @tab-change="reload">
        <!-- 轮播图 -->
        <el-tab-pane label="轮播图" name="banners">
          <div class="toolbar">
            <el-button type="primary" @click="openBanner()">新增轮播图</el-button>
          </div>
          <el-table :data="banners" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" width="160" />
            <el-table-column label="图片" width="110">
              <template #default="{ row }">
                <el-image v-if="row.imageUrl" :src="row.imageUrl" fit="cover" class="thumb" />
              </template>
            </el-table-column>
            <el-table-column prop="linkUrl" label="跳转链接" />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '上架中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button link type="primary" @click="openBanner(row)">编辑</el-button>
                <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggle('banner', row)">{{ row.status === 1 ? '下架' : '上架' }}</el-button>
                <el-button link type="danger" @click="remove('banner', row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 活动横幅 -->
        <el-tab-pane label="活动横幅" name="activities">
          <div class="toolbar">
            <el-button type="primary" @click="openActivity()">新增活动</el-button>
          </div>
          <el-table :data="activities" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" width="160" />
            <el-table-column label="图片" width="110">
              <template #default="{ row }">
                <el-image v-if="row.imageUrl" :src="row.imageUrl" fit="cover" class="thumb" />
              </template>
            </el-table-column>
            <el-table-column prop="linkUrl" label="跳转链接" />
            <el-table-column label="活动时间" width="200">
              <template #default="{ row }">{{ formatTime(row.startTime) }} ~ {{ formatTime(row.endTime) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '上架中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button link type="primary" @click="openActivity(row)">编辑</el-button>
                <el-button link type="danger" @click="remove('activity', row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 公告 -->
        <el-tab-pane label="公告" name="announcements">
          <div class="toolbar">
            <el-button type="primary" @click="openAnnouncement()">新增公告</el-button>
          </div>
          <el-table :data="announcements" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" width="200" />
            <el-table-column prop="content" label="内容" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '展示中' : '已下架' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button link type="primary" @click="openAnnouncement(row)">编辑</el-button>
                <el-button link type="danger" @click="remove('announcement', row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 热搜词 -->
        <el-tab-pane label="热搜词" name="keywords">
          <div class="toolbar">
            <el-input v-model="kwForm.keyword" placeholder="热词" class="kw-input" />
            <el-input-number v-model="kwForm.sort" :min="0" controls-position="right" />
            <el-button type="primary" @click="saveKeyword">保存热词</el-button>
          </div>
          <el-table :data="keywords" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="keyword" label="热词" />
            <el-table-column prop="sort" label="排序" width="100" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click="editKeyword(row)">编辑</el-button>
                <el-button link type="danger" @click="remove('keyword', row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 轮播图弹窗 -->
    <el-dialog v-model="bannerDialog" :title="bannerForm.id ? '编辑轮播图' : '新增轮播图'" width="460px">
      <el-form label-width="90px">
        <el-form-item label="标题"><el-input v-model="bannerForm.title" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="bannerForm.imageUrl" placeholder="http://..." /></el-form-item>
        <el-form-item label="跳转链接"><el-input v-model="bannerForm.linkUrl" /></el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="bannerForm.sort" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="bannerForm.status" :active-value="1" :inactive-value="0" active-text="上架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bannerDialog = false">取消</el-button>
        <el-button type="primary" @click="saveBanner">保存</el-button>
      </template>
    </el-dialog>

    <!-- 活动弹窗 -->
    <el-dialog v-model="activityDialog" :title="activityForm.id ? '编辑活动' : '新增活动'" width="460px">
      <el-form label-width="90px">
        <el-form-item label="标题"><el-input v-model="activityForm.title" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="activityForm.imageUrl" placeholder="http://..." /></el-form-item>
        <el-form-item label="跳转链接"><el-input v-model="activityForm.linkUrl" /></el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="activityForm.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="activityForm.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="activityForm.status" :active-value="1" :inactive-value="0" active-text="上架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activityDialog = false">取消</el-button>
        <el-button type="primary" @click="saveActivity">保存</el-button>
      </template>
    </el-dialog>

    <!-- 公告弹窗 -->
    <el-dialog v-model="annDialog" :title="annForm.id ? '编辑公告' : '新增公告'" width="460px">
      <el-form label-width="70px">
        <el-form-item label="标题"><el-input v-model="annForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="annForm.content" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="annForm.status" :active-value="1" :inactive-value="0" active-text="展示" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="annDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAnnouncement">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const tab = ref('banners');

const banners = ref<any[]>([]);
const activities = ref<any[]>([]);
const announcements = ref<any[]>([]);
const keywords = ref<any[]>([]);

const bannerDialog = ref(false);
const bannerForm = reactive<any>({ title: '', imageUrl: '', linkUrl: '', sort: 0, status: 1 });

const activityDialog = ref(false);
const activityForm = reactive<any>({ title: '', imageUrl: '', linkUrl: '', startTime: '', endTime: '', status: 1 });

const annDialog = ref(false);
const annForm = reactive<any>({ title: '', content: '', status: 1 });

const kwForm = reactive<any>({ keyword: '', sort: 0 });

function formatTime(t: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '-';
}

async function loadBanners() {
  try {
    banners.value = await request.get('/admin/banners');
  } catch {
    // 已提示
  }
}

async function loadActivities() {
  try {
    activities.value = await request.get('/admin/activities');
  } catch {
    // 已提示
  }
}

async function loadAnnouncements() {
  try {
    announcements.value = await request.get('/admin/announcements');
  } catch {
    // 已提示
  }
}

async function loadKeywords() {
  try {
    keywords.value = await request.get('/search/hot');
  } catch {
    // 已提示
  }
}

function openBanner(row?: any) {
  Object.assign(bannerForm, row ? { id: row.id, title: row.title, imageUrl: row.imageUrl, linkUrl: row.linkUrl, sort: row.sort, status: row.status } : { id: undefined, title: '', imageUrl: '', linkUrl: '', sort: 0, status: 1 });
  bannerDialog.value = true;
}

async function saveBanner() {
  if (!bannerForm.title || !bannerForm.imageUrl) {
    ElMessage.warning('请填写标题和图片URL');
    return;
  }
  try {
    await request.post('/admin/banners/save', bannerForm);
    ElMessage.success('已保存');
    bannerDialog.value = false;
    loadBanners();
  } catch {
    // 已提示
  }
}

function openActivity(row?: any) {
  Object.assign(activityForm, row ? { id: row.id, title: row.title, imageUrl: row.imageUrl, linkUrl: row.linkUrl, startTime: row.startTime ? formatTime(row.startTime) : '', endTime: row.endTime ? formatTime(row.endTime) : '', status: row.status } : { id: undefined, title: '', imageUrl: '', linkUrl: '', startTime: '', endTime: '', status: 1 });
  activityDialog.value = true;
}

async function saveActivity() {
  if (!activityForm.title || !activityForm.imageUrl) {
    ElMessage.warning('请填写标题和图片URL');
    return;
  }
  try {
    await request.post('/admin/activities/save', activityForm);
    ElMessage.success('已保存');
    activityDialog.value = false;
    loadActivities();
  } catch {
    // 已提示
  }
}

function openAnnouncement(row?: any) {
  Object.assign(annForm, row ? { id: row.id, title: row.title, content: row.content, status: row.status } : { id: undefined, title: '', content: '', status: 1 });
  annDialog.value = true;
}

async function saveAnnouncement() {
  if (!annForm.title || !annForm.content) {
    ElMessage.warning('请填写标题和内容');
    return;
  }
  try {
    await request.post('/admin/announcements/save', annForm);
    ElMessage.success('已保存');
    annDialog.value = false;
    loadAnnouncements();
  } catch {
    // 已提示
  }
}

async function toggle(kind: string, row: any) {
  try {
    await request.post(`/admin/${kind}s/${row.id}/toggle`);
    ElMessage.success('已切换');
    loadBanners();
  } catch {
    // 已提示
  }
}

async function remove(kind: string, row: any) {
  try {
    await ElMessageBox.confirm('确定删除该条目？', '提示', { type: 'warning' });
    await request.post(`/admin/${kind}s/${row.id}/delete`);
    ElMessage.success('已删除');
    reload();
  } catch (e: any) {
    // 取消或已提示
  }
}

function editKeyword(row: any) {
  kwForm.id = row.id;
  kwForm.keyword = row.keyword;
  kwForm.sort = row.sort;
}

async function saveKeyword() {
  if (!kwForm.keyword.trim()) {
    ElMessage.warning('请输入热词');
    return;
  }
  try {
    await request.post('/admin/hot-keywords/save', { id: kwForm.id, keyword: kwForm.keyword.trim(), sort: kwForm.sort });
    ElMessage.success('已保存');
    kwForm.id = undefined;
    kwForm.keyword = '';
    kwForm.sort = 0;
    loadKeywords();
  } catch {
    // 已提示
  }
}

function reload() {
  if (tab.value === 'banners') loadBanners();
  if (tab.value === 'activities') loadActivities();
  if (tab.value === 'announcements') loadAnnouncements();
  if (tab.value === 'keywords') loadKeywords();
}

onMounted(() => {
  loadBanners();
  loadActivities();
  loadAnnouncements();
  loadKeywords();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.thumb {
  width: 70px;
  height: 40px;
  border-radius: 4px;
}
.kw-input {
  width: 200px;
}
</style>
