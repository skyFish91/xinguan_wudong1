<template>
  <div class="feed-page">
    <TopNav />
    <div class="page">
      <!-- 顶部横幅 -->
      <div class="banner">
        <div class="banner-content">
          <h1 class="banner-title">🌄 探索乌东</h1>
          <p class="banner-desc">分享你的旅行故事，发现更多美好</p>
        </div>
        <el-button type="primary" size="large" class="publish-btn-banner" @click="$router.push('/community/publish')">
          <el-icon><EditPen /></el-icon> 发布游记
        </el-button>
      </div>

      <!-- 话题筛选 -->
      <div class="topics-section" v-if="topics.length">
        <div class="section-label">热门话题</div>
        <div class="topics-scroll">
          <el-tag
            v-for="t in topics"
            :key="t.id"
            :effect="currentTopic === t.id ? 'dark' : 'plain'"
            :type="currentTopic === t.id ? 'primary' : 'info'"
            class="topic-tag"
            size="large"
            round
            @click="onTopic(t)"
          >
            {{ getTopicIcon(t) }} {{ t.name }}
          </el-tag>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <el-radio-group v-model="tab" @change="load(1)" size="large">
          <el-radio-button value="all">📅 最新</el-radio-button>
          <el-radio-button value="hot">🔥 热门</el-radio-button>
          <el-radio-button value="follow">👥 关注</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索游记..."
          class="search-input"
          clearable
          @keyup.enter="load(1)"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 游记列表 -->
      <div v-if="loading && !list.length" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="!list.length" class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">暂无游记</div>
        <el-button type="primary" @click="$router.push('/community/publish')">发布第一篇游记</el-button>
      </div>

      <div v-else class="posts-grid">
        <div v-for="p in list" :key="p.id" class="post-card" @click="$router.push(`/community/${p.id}`)">
          <!-- 图片区域 -->
          <div class="post-image">
            <img v-if="firstImage(p.images)" :src="firstImage(p.images)" class="cover-img" />
            <div v-else class="cover-placeholder">
              <el-icon><Picture /></el-icon>
            </div>
            <el-tag v-if="p.isHot" class="hot-badge" type="danger" effect="dark" size="small">🔥 热门</el-tag>
          </div>

          <!-- 内容区域 -->
          <div class="post-body">
            <h3 class="post-title">{{ p.title }}</h3>
            <p class="post-excerpt">{{ truncateText(p.content, 80) }}</p>

            <!-- 作者信息 -->
            <div class="post-author">
              <img v-if="p.author?.avatar" :src="p.author.avatar" class="author-avatar" />
              <div v-else class="author-avatar-placeholder">👤</div>
              <span class="author-name">{{ p.author?.nickname || `用户${p.userId}` }}</span>
              <span class="post-time">{{ formatTime(p.publishedAt || p.createdAt) }}</span>
            </div>

            <!-- 话题标签 -->
            <div v-if="p.topic" class="post-topic">
              <el-tag size="small" type="info" effect="plain">#{{ p.topic.name }}</el-tag>
            </div>

            <!-- 互动数据 -->
            <div class="post-stats">
              <span class="stat-item">
                <el-icon><View /></el-icon>
                {{ formatCount(p.viewCount) }}
              </span>
              <span class="stat-item">
                <el-icon><Star /></el-icon>
                {{ formatCount(p.likeCount) }}
              </span>
              <span class="stat-item">
                <el-icon><ChatDotRound /></el-icon>
                {{ formatCount(p.commentCount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="total > pageSize"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        class="pager"
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { EditPen, Search, Loading, Picture, View, Star, ChatDotRound } from '@element-plus/icons-vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const topics = ref<any[]>([]);
const currentTopic = ref<number>(0);
const tab = ref('all');
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 12;
const loading = ref(false);
const searchKeyword = ref('');

function firstImage(images: string) {
  try {
    const arr = JSON.parse(images || '[]');
    return arr.length ? arr[0] : '';
  } catch {
    return '';
  }
}

function formatTime(t: string) {
  if (!t) return '';
  const date = new Date(t);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;

  return date.toLocaleDateString();
}

function formatCount(count: number) {
  if (!count) return 0;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count;
}

function truncateText(text: string, length: number) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function getTopicIcon(topic: any) {
  const iconMap: Record<string, string> = {
    '苗寨风光': '🏞️',
    '非遗手作': '✋',
    '苗家美食': '🍜',
    '旅拍攻略': '📷',
  };
  return iconMap[topic.name] || '📌';
}

function onTopic(t: any) {
  currentTopic.value = currentTopic.value === t.id ? 0 : t.id;
  load(1);
}

async function load(p = 1) {
  page.value = p;
  if (tab.value === 'follow' && !userStore.isLogin) {
    ElMessage.warning('请先登录后查看关注内容');
    tab.value = 'all';
    return;
  }
  loading.value = true;
  try {
    const params: any = {
      tab: tab.value === 'follow' ? 'follow' : tab.value === 'hot' ? 'hot' : undefined,
      topicId: currentTopic.value || undefined,
      page: page.value,
      pageSize,
    };
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim();
    }
    const data: any = await request.get('/community/posts', { params });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch (err: any) {
    if (tab.value === 'follow' && !userStore.isLogin) {
      ElMessage.warning('请先登录后查看关注内容');
      tab.value = 'all';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  // 从 URL 参数获取话题 ID
  const topicId = route.query.topic;
  if (topicId) {
    currentTopic.value = parseInt(topicId as string);
  }

  try {
    topics.value = await request.get('/community/topics');
  } catch {
    // 已提示
  }
  load(1);
});
</script>

<style scoped>
.feed-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
}

/* 顶部横幅 */
.banner {
  background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url('/uploads/social-photos/wudong-miao-village.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 16px;
  padding: 60px 40px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  min-height: 280px;
}

.banner-content {
  color: white;
}

.banner-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: bold;
}

.banner-desc {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.publish-btn-banner {
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  background: white;
  color: #667eea;
  border: none;
}

.publish-btn-banner:hover {
  background: #f0f0f0;
}

/* 话题区域 */
.topics-section {
  margin-bottom: 24px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
}

.topics-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.topics-scroll::-webkit-scrollbar {
  height: 6px;
}

.topics-scroll::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.topic-tag {
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  white-space: nowrap;
}

.topic-tag:hover {
  transform: translateY(-2px);
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-input {
  max-width: 300px;
  margin-left: auto;
}

/* 游记网格 */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.post-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.post-card:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.15);
  transform: translateY(-8px);
  border-color: #409eff;
}

.post-image {
  position: relative;
  height: 200px;
  background: #f5f7fa;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.post-card:hover .cover-img {
  transform: scale(1.1);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #dcdfe6;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf0 100%);
}

.hot-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-weight: 600;
}

.post-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-excerpt {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.author-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.author-avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.author-name {
  font-size: 13px;
  color: #409eff;
  font-weight: 600;
}

.post-time {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.post-topic {
  margin-top: -6px;
}

.post-stats {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
  transition: color 0.3s;
}

.stat-item:hover {
  color: #409eff;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #909399;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}

.loading-state .el-icon {
  font-size: 32px;
}

.empty-state {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #606266;
  margin-bottom: 24px;
}

.pager {
  margin-top: 30px;
  justify-content: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .page {
    padding: 12px;
  }

  .banner {
    flex-direction: column;
    padding: 24px;
    gap: 20px;
  }

  .banner-title {
    font-size: 24px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: 100%;
    margin-left: 0;
  }

  .posts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .topics-scroll {
    gap: 8px;
  }
}
</style>
