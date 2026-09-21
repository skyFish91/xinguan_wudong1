<template>
  <div class="topics-page">
    <TopNav />

    <!-- Hero Banner -->
    <div class="hero-banner">
      <div class="hero-content">
        <h1 class="hero-title">热门话题</h1>
        <p class="hero-subtitle">发现你感兴趣的内容</p>
      </div>
    </div>

    <div class="page-container">

      <!-- 搜索栏 -->
      <div class="search-section">
        <el-input
          v-model="searchKeyword"
          size="large"
          placeholder="搜索话题..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 话题列表 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredTopics.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">{{ searchKeyword ? '未找到相关话题' : '暂无话题' }}</div>
      </div>

      <div v-else class="topics-grid">
        <div
          v-for="topic in filteredTopics"
          :key="topic.id"
          class="topic-card"
          @click="$router.push(`/community/feed?topic=${topic.id}`)"
        >
          <div class="topic-cover">
            <img v-if="topic.coverImage" :src="topic.coverImage" class="cover-img" />
            <div v-else class="topic-bg">
              <div class="topic-icon">{{ getTopicIcon(topic.name) }}</div>
            </div>
          </div>
          <div class="topic-content">
            <h3 class="topic-name">#{{ topic.name }}</h3>
            <p class="topic-intro">{{ topic.intro }}</p>
            <div class="topic-stats">
              <span class="stat-item">
                <el-icon><Document /></el-icon>
                {{ topic.postCount }} 篇游记
              </span>
              <span class="stat-item">
                <el-icon><User /></el-icon>
                {{ topic.followCount }} 关注
              </span>
            </div>
          </div>
          <div class="topic-actions">
            <el-button
              v-if="!topic.isFollowing"
              type="primary"
              size="small"
              round
              @click.stop="followTopic(topic.id)"
            >
              + 关注
            </el-button>
            <el-button
              v-else
              size="small"
              round
              @click.stop="unfollowTopic(topic.id)"
            >
              已关注
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Search, Loading, Document, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import TopNav from '../../components/TopNav.vue'
import request from '../../api/request'

const topics = ref<any[]>([])
const loading = ref(false)
const searchKeyword = ref('')

const filteredTopics = computed(() => {
  if (!searchKeyword.value.trim()) {
    return topics.value
  }
  const keyword = searchKeyword.value.trim().toLowerCase()
  return topics.value.filter(t =>
    t.name.toLowerCase().includes(keyword) ||
    (t.intro || '').toLowerCase().includes(keyword)
  )
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await request.get('/community/topics')
    topics.value = Array.isArray(data) ? data : data.list || []
  } catch (err) {
    console.error('加载话题失败:', err)
  } finally {
    loading.value = false
  }
})

function getTopicIcon(name: string) {
  const iconMap: Record<string, string> = {
    乌东温泉: '♨️',
    乌东美食: '🍜',
    乌东山野: '⛰️',
    乌东古镇: '🏛️',
    乌东民宿: '🏠',
    乌东打卡: '📍',
    乌东亲子游: '👨‍👩‍👧',
    乌东非遗: '🎭',
    苗寨风光: '🏞️',
    非遗手作: '✋',
    苗家美食: '🥘',
    旅拍攻略: '📷',
  }
  return iconMap[name] || '📌'
}

function handleSearch() {
  // 搜索由 computed 自动处理
}

async function followTopic(id: number) {
  try {
    await request.post(`/community/topics/${id}/follow`)
    ElMessage.success('关注成功')
    const topic = topics.value.find(t => t.id === id)
    if (topic) {
      topic.isFollowing = true
      topic.followCount = (topic.followCount || 0) + 1
    }
  } catch (err) {
    console.error('关注失败:', err)
  }
}

async function unfollowTopic(id: number) {
  try {
    await request.delete(`/community/topics/${id}/follow`)
    ElMessage.success('已取消关注')
    const topic = topics.value.find(t => t.id === id)
    if (topic) {
      topic.isFollowing = false
      topic.followCount = Math.max(0, (topic.followCount || 0) - 1)
    }
  } catch (err) {
    console.error('取消关注失败:', err)
  }
}
</script>

<style scoped>
.topics-page {
  min-height: 100vh;
  background: #FAFAF8;
}

.hero-banner {
  background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url('/uploads/social-photos/heritage-craft.jpg');
  background-size: cover;
  background-position: center;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
}

.hero-content {
  text-align: center;
  color: white;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 16px 0;
  letter-spacing: 2px;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 20px;
  margin: 0;
  opacity: 0.95;
  font-weight: 300;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.search-section {
  max-width: 600px;
  margin: 0 auto 40px auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 20px;
  color: #888;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.topic-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.topic-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(212, 160, 23, 0.2);
}

.topic-cover {
  height: 140px;
  overflow: hidden;
  position: relative;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.topic-bg {
  height: 140px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.topic-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
}

.topic-icon {
  font-size: 64px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.topic-content {
  padding: 20px;
  flex: 1;
}

.topic-name {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.topic-intro {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 44px;
}

.topic-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topic-actions {
  padding: 0 20px 20px 20px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .page-container {
    padding: 24px 16px;
  }

  .page-title {
    font-size: 28px;
  }

  .topics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
