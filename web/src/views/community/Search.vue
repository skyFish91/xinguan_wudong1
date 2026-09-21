<template>
  <div class="search-page">
    <TopNav />
    <div class="page">
      <!-- 搜索栏 -->
      <div class="search-container">
        <div class="search-box">
          <el-input
            v-model="keyword"
            placeholder="搜索游记、话题、用户..."
            size="large"
            @keyup.enter="search"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #suffix>
              <el-button type="primary" @click="search">搜索</el-button>
            </template>
          </el-input>
        </div>

        <!-- 高级筛选 -->
        <div class="filters">
          <el-select v-model="searchType" placeholder="搜索类型" @change="search">
            <el-option label="全部" value="all" />
            <el-option label="游记" value="posts" />
            <el-option label="话题" value="topics" />
            <el-option label="用户" value="users" />
          </el-select>
          <el-select v-model="sortBy" placeholder="排序方式" @change="search">
            <el-option label="最新" value="latest" />
            <el-option label="热度" value="hot" />
            <el-option label="赞数" value="likes" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="search"
            style="width: 300px"
          />
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searched && !loading" class="results-container">
        <div class="results-header">
          <span class="results-count">找到 {{ total }} 个结果</span>
          <span class="search-time">耗时 {{ searchTime }}ms</span>
        </div>

        <!-- 游记结果 -->
        <div v-if="(searchType === 'all' || searchType === 'posts') && posts.length" class="results-section">
          <h3 class="section-title">
            <el-icon><DocumentCopy /></el-icon>
            游记 ({{ posts.length }})
          </h3>
          <div class="results-list">
            <div
              v-for="post in posts"
              :key="post.id"
              class="result-item"
              @click="viewPost(post.id)"
            >
              <img v-if="postCover(post)" :src="postCover(post)" class="result-image" />
              <div class="result-content">
                <h4 class="result-title">{{ post.title }}</h4>
                <p class="result-excerpt">{{ truncate(post.content, 100) }}</p>
                <div class="result-meta">
                  <span class="author">{{ post.author?.nickname || '游客' }}</span>
                  <span class="stats">
                    <el-icon><View /></el-icon> {{ post.viewCount || 0 }}
                    <el-icon><Star /></el-icon> {{ post.likeCount || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 话题结果 -->
        <div v-if="(searchType === 'all' || searchType === 'topics') && topics.length" class="results-section">
          <h3 class="section-title">
            <el-icon><CollectionTag /></el-icon>
            话题 ({{ topics.length }})
          </h3>
          <div class="results-list">
            <div
              v-for="topic in topics"
              :key="topic.id"
              class="result-item"
              @click="selectTopic(topic.id)"
            >
              <div class="topic-icon">{{ topic.icon || '📌' }}</div>
              <div class="result-content">
                <h4 class="result-title">#{{ topic.name }}</h4>
                <p class="result-excerpt">{{ topic.description || '热门话题' }}</p>
                <div class="result-meta">
                  <span class="stats">
                    <el-icon><User /></el-icon> {{ topic.followerCount || 0 }} 关注
                    <el-icon><ChatSquare /></el-icon> {{ topic.postCount || 0 }} 讨论
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户结果 -->
        <div v-if="(searchType === 'all' || searchType === 'users') && users.length" class="results-section">
          <h3 class="section-title">
            <el-icon><User /></el-icon>
            用户 ({{ users.length }})
          </h3>
          <div class="results-list">
            <div
              v-for="user in users"
              :key="user.id"
              class="result-item user-item"
            >
              <img v-if="user.avatar" :src="user.avatar" class="user-avatar" />
              <div class="result-content">
                <h4 class="result-title">{{ user.nickname }}</h4>
                <p class="result-excerpt">{{ user.bio || '旅行爱好者' }}</p>
                <div class="result-meta">
                  <span class="stats">
                    <el-icon><User /></el-icon> 粉丝 {{ user.followerCount || 0 }}
                  </span>
                </div>
              </div>
              <el-button size="small" type="primary">关注</el-button>
            </div>
          </div>
        </div>

        <!-- 空结果 -->
        <el-empty v-if="!posts.length && !topics.length && !users.length" description="没有找到相关内容" />

        <!-- 分页 -->
        <div v-if="total > pageSize" class="pager">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="search"
          />
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>搜索中...</span>
      </div>

      <!-- 初始状态 -->
      <div v-if="!searched" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>输入关键词开始搜索</p>
        <p class="tips">搜索游记、话题或用户</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  DocumentCopy,
  CollectionTag,
  User,
  View,
  Star,
  ChatSquare,
  Loading
} from '@element-plus/icons-vue'
import TopNav from '../../components/TopNav.vue'
import request from '../../api/request'

const router = useRouter()

const keyword = ref('')
const searchType = ref('all')
const sortBy = ref('latest')
const dateRange = ref<[Date, Date] | null>(null)
const page = ref(1)
const pageSize = 10

const searched = ref(false)
const loading = ref(false)
const posts = ref<any[]>([])
const topics = ref<any[]>([])
const users = ref<any[]>([])
const total = ref(0)
const searchTime = ref(0)

function postCover(post: any) {
  if (!post.images) return ''
  try {
    const arr = JSON.parse(post.images)
    return arr[0] || ''
  } catch {
    return post.images
  }
}

function truncate(text: string, len: number) {
  return (text || '').length > len ? text.substring(0, len) + '...' : text
}

function viewPost(id: number) {
  router.push(`/community/${id}`)
}

function selectTopic(topicId: number) {
  router.push(`/community/feed?topic=${topicId}`)
}

async function search() {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  loading.value = true
  const startTime = Date.now()

  try {
    const params: any = {
      keyword: keyword.value,
      page: page.value,
      pageSize,
    }

    if (searchType.value !== 'all') {
      params.type = searchType.value
    }
    if (sortBy.value) {
      params.sortBy = sortBy.value
    }
    if (dateRange.value) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }

    const data: any = await request.get('/community/search', { params })

    posts.value = data.posts || []
    topics.value = data.topics || []
    users.value = data.users || []
    total.value = (data.posts?.length || 0) + (data.topics?.length || 0) + (data.users?.length || 0)

    searched.value = true
    searchTime.value = Date.now() - startTime
  } catch (err) {
    console.error('搜索失败:', err)
    ElMessage.error('搜索失败，请重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const route = router.currentRoute.value
  if (route.query.q) {
    keyword.value = route.query.q as string
    search()
  }
})
</script>

<style scoped>
.search-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.search-container {
  background: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 40px;
}

.search-box {
  margin-bottom: 20px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filters .el-select,
.filters .el-date-picker {
  flex: 1;
  min-width: 150px;
}

.results-container {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 0 15px 0;
  border-bottom: 1px solid #eee;
}

.results-count {
  font-size: 16px;
  font-weight: bold;
}

.search-time {
  color: #999;
  font-size: 12px;
}

.results-section {
  margin-bottom: 40px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 20px 0;
  color: #333;
}

.section-title .el-icon {
  font-size: 18px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.result-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
}

.result-image,
.topic-icon {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.topic-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: #f5f7fa;
}

.result-content {
  flex: 1;
  overflow: hidden;
}

.result-title {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-excerpt {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.stats {
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-meta .el-icon {
  font-size: 12px;
}

.result-item.user-item {
  justify-content: space-between;
  align-items: center;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state p {
  margin: 0 0 8px 0;
  color: #666;
}

.empty-state p.tips {
  font-size: 14px;
  color: #999;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.loading-state .el-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.loading-state span {
  margin-left: 10px;
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}
</style>
