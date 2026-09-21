<template>
  <div class="user-home">
    <TopNav />
    <div class="page">
      <!-- 用户信息头部 -->
      <div class="profile-header">
        <div class="user-basic">
          <img v-if="user.avatar" :src="user.avatar" class="user-avatar" />
          <div v-else class="user-avatar-placeholder">👤</div>
          <div class="user-info">
            <h2 class="user-name">{{ user.nickname }}</h2>
            <p class="user-bio">{{ user.bio || '这个用户还没有简介' }}</p>
            <p class="user-region" v-if="user.region">📍 {{ user.region }}</p>
          </div>
        </div>

        <div class="user-stats">
          <div class="stat-item">
            <div class="stat-number">{{ user.followerCount || 0 }}</div>
            <div class="stat-label">粉丝</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ user.followingCount || 0 }}</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ user.likeCount || 0 }}</div>
            <div class="stat-label">获赞</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ user.postCount || 0 }}</div>
            <div class="stat-label">游记</div>
          </div>
        </div>

        <div class="profile-actions">
          <el-button v-if="!isOwnProfile" :type="user.isFollowing ? 'default' : 'primary'" @click="toggleFollow">
            {{ user.isFollowing ? '已关注' : '+ 关注' }}
          </el-button>
          <el-button v-if="!isOwnProfile">私信</el-button>
        </div>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" class="profile-tabs">
        <!-- 发布的游记 -->
        <el-tab-pane label="发布的游记" name="posts">
          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon> 加载中...
          </div>
          <div v-else-if="posts.length" class="posts-grid">
            <div
              v-for="post in posts"
              :key="post.id"
              class="post-card"
              @click="$router.push(`/community/${post.id}`)"
            >
              <div class="post-img-wrapper">
                <img
                  v-if="getPostCover(post)"
                  :src="getPostCover(post)"
                  class="post-cover"
                />
                <div v-else class="post-cover-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
              </div>
              <div class="post-info">
                <div class="post-title">{{ post.title }}</div>
                <div class="post-meta">
                  <span>{{ formatTime(post.publishedAt || post.createdAt) }}</span>
                  <span>👁 {{ post.viewCount || 0 }}</span>
                  <span>❤ {{ post.likeCount || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="还没有发布游记" />
        </el-tab-pane>

        <!-- 点赞的游记 -->
        <el-tab-pane label="点赞的游记" name="likes">
          <div v-if="!isOwnProfile" class="private-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>仅自己可见</span>
          </div>
          <div v-else>
            <div v-if="loading" class="loading-state">
              <el-icon class="is-loading"><Loading /></el-icon> 加载中...
            </div>
            <div v-else-if="likedPosts.length" class="posts-list">
              <div
                v-for="post in likedPosts"
                :key="post.id"
                class="post-list-item"
                @click="$router.push(`/community/${post.id}`)"
              >
                <img
                  v-if="getPostCover(post)"
                  :src="getPostCover(post)"
                  class="post-thumb"
                />
                <div v-else class="post-thumb-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
                <div class="post-detail">
                  <div class="post-title">{{ post.title }}</div>
                  <div class="post-author">{{ post.author?.nickname }}</div>
                  <div class="post-meta">
                    {{ formatTime(post.publishedAt || post.createdAt) }} · ❤ {{ post.likeCount }}
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="还没有点赞过游记" />
          </div>
        </el-tab-pane>

        <!-- 收藏的游记 -->
        <el-tab-pane label="收藏的游记" name="favorites">
          <div v-if="!isOwnProfile" class="private-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>仅自己可见</span>
          </div>
          <div v-else>
            <div v-if="loading" class="loading-state">
              <el-icon class="is-loading"><Loading /></el-icon> 加载中...
            </div>
            <div v-else-if="favoritePosts.length" class="posts-list">
              <div
                v-for="post in favoritePosts"
                :key="post.id"
                class="post-list-item"
                @click="$router.push(`/community/${post.id}`)"
              >
                <img
                  v-if="getPostCover(post)"
                  :src="getPostCover(post)"
                  class="post-thumb"
                />
                <div v-else class="post-thumb-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
                <div class="post-detail">
                  <div class="post-title">{{ post.title }}</div>
                  <div class="post-author">{{ post.author?.nickname }}</div>
                  <div class="post-meta">
                    {{ formatTime(post.publishedAt || post.createdAt) }} · ⭐ 已收藏
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="还没有收藏过游记" />
          </div>
        </el-tab-pane>

        <!-- 关注的作者 -->
        <el-tab-pane label="关注的作者" name="following">
          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon> 加载中...
          </div>
          <div v-else-if="followingUsers.length" class="users-grid">
            <div v-for="u in followingUsers" :key="u.id" class="user-card">
              <img v-if="u.avatar" :src="u.avatar" class="card-avatar" />
              <div v-else class="card-avatar-placeholder">👤</div>
              <div class="card-info">
                <div class="card-name" @click.stop="$router.push(`/user/${u.id}`)">
                  {{ u.nickname }}
                </div>
                <div class="card-bio">{{ u.bio || '暂无简介' }}</div>
                <div class="card-stats">粉丝 {{ u.followerCount || 0 }}</div>
              </div>
            </div>
          </div>
          <el-empty v-else description="还没有关注任何作者" />
        </el-tab-pane>

        <!-- 关注的话题 -->
        <el-tab-pane label="关注的话题" name="topics">
          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon> 加载中...
          </div>
          <div v-else-if="followingTopics.length" class="topics-list">
            <div
              v-for="topic in followingTopics"
              :key="topic.id"
              class="topic-item"
              @click="$router.push(`/community/feed?topic=${topic.id}`)"
            >
              <div class="topic-main">
                <div class="topic-name">#{{ topic.name }}</div>
                <div class="topic-desc">{{ topic.description || '热门话题' }}</div>
                <div class="topic-stats">
                  {{ topic.postCount || 0 }} 篇讨论 · {{ topic.followerCount || 0 }} 人关注
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="还没有关注任何话题" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Picture, InfoFilled } from '@element-plus/icons-vue'
import TopNav from '../../components/TopNav.vue'
import request from '../../api/request'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const userId = computed(() => parseInt(route.params.userId as string))
const isOwnProfile = computed(() => userId.value === userStore.userInfo?.id)

const user = ref<any>({})
const activeTab = ref('posts')
const loading = ref(false)

const posts = ref<any[]>([])
const likedPosts = ref<any[]>([])
const favoritePosts = ref<any[]>([])
const followingUsers = ref<any[]>([])
const followingTopics = ref<any[]>([])

function getPostCover(post: any) {
  if (!post.images) return ''
  try {
    const arr = JSON.parse(post.images)
    return arr[0] || ''
  } catch {
    return post.images
  }
}

function formatTime(time: string) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`

  return date.toLocaleDateString()
}

async function loadUserInfo() {
  try {
    const data: any = await request.get(`/user/${userId.value}`)
    user.value = data
  } catch (err) {
    console.error('加载用户信息失败:', err)
  }
}

async function loadData() {
  loading.value = true
  try {
    const requests = [
      request.get(`/user/${userId.value}/posts?pageSize=12`),
      request.get(`/user/${userId.value}/following?pageSize=12`),
      request.get(`/user/${userId.value}/followingTopics?pageSize=12`),
    ]

    if (isOwnProfile.value) {
      requests.push(request.get(`/user/${userId.value}/likes?pageSize=12`))
      requests.push(request.get(`/user/${userId.value}/favorites?pageSize=12`))
    }

    const [postsData, followingData, topicsData, likesData, favoritesData]: any =
      await Promise.all(requests)

    posts.value = postsData?.list || postsData || []
    followingUsers.value = followingData?.list || followingData || []
    followingTopics.value = topicsData?.list || topicsData || []
    likedPosts.value = likesData?.list || likesData || []
    favoritePosts.value = favoritesData?.list || favoritesData || []
  } catch (err) {
    console.error('加载数据失败:', err)
  } finally {
    loading.value = false
  }
}

async function toggleFollow() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  try {
    const r: any = await request.post(`/user/${userId.value}/follow`)
    user.value.isFollowing = r.following
    ElMessage.success(r.following ? '已关注' : '已取消关注')
  } catch (err) {
    console.error('关注失败:', err)
  }
}

onMounted(() => {
  loadUserInfo()
  loadData()
})
</script>

<style scoped>
.user-home {
  background: #f5f7fa;
  min-height: 100vh;
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  background: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
}

.user-basic {
  display: flex;
  gap: 20px;
  flex: 1;
  align-items: center;
}

.user-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: bold;
}

.user-bio {
  margin: 0 0 8px 0;
  color: #666;
}

.user-region {
  margin: 0;
  color: #999;
  font-size: 14px;
}

.user-stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.profile-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.profile-tabs {
  background: white;
  border-radius: 8px;
  padding: 0;
}

.profile-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 20px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
}

.post-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.post-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.post-img-wrapper {
  height: 150px;
  background: #f0f0f0;
  overflow: hidden;
}

.post-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #ccc;
}

.post-info {
  padding: 12px;
}

.post-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-meta {
  font-size: 12px;
  color: #999;
  display: flex;
  justify-content: space-between;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.post-list-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.post-list-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.post-thumb {
  width: 100px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.post-thumb-placeholder {
  width: 100px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ccc;
  flex-shrink: 0;
}

.post-detail {
  flex: 1;
  overflow: hidden;
}

.post-author {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  padding: 20px;
}

.user-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.user-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto;
}

.card-avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto;
}

.card-info {
  margin-top: 12px;
}

.card-name {
  cursor: pointer;
  color: #409eff;
  font-weight: bold;
  margin: 8px 0;
}

.card-name:hover {
  text-decoration: underline;
}

.card-bio {
  font-size: 12px;
  color: #999;
  margin: 6px 0;
}

.card-stats {
  font-size: 12px;
  color: #999;
  margin: 8px 0;
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.topic-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.topic-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.topic-main {
  flex: 1;
}

.topic-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.topic-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.topic-stats {
  font-size: 12px;
  color: #999;
}

.private-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  padding: 12px 16px;
  color: #664d03;
  margin-bottom: 20px;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-state .el-icon {
  font-size: 24px;
  margin-right: 8px;
  vertical-align: middle;
}

@media (max-width: 1024px) {
  .profile-header {
    flex-direction: column;
    gap: 20px;
  }

  .user-stats {
    width: 100%;
    justify-content: space-around;
  }

  .profile-actions {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .page {
    padding: 12px;
  }

  .profile-header {
    padding: 20px;
  }

  .user-basic {
    flex-direction: column;
    text-align: center;
  }

  .user-avatar {
    width: 100px;
    height: 100px;
  }

  .posts-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .users-grid {
    grid-template-columns: 1fr;
  }

  .posts-list,
  .topics-list {
    padding: 12px;
  }
}
</style>
