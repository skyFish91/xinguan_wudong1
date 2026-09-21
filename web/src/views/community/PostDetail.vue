<template>
  <div>
    <TopNav />
    <div class="page" v-if="post.id">
      <h2>{{ post.title }}</h2>
      <div class="head-meta">
        <span v-if="post.topic">#{{ post.topic.name }}</span>
        <span>{{ post.author?.nickname || `用户${post.userId}` }}</span>
        <span>{{ formatTime(post.publishedAt || post.createdAt) }}</span>
        <span>浏览 {{ post.viewCount }}</span>
      </div>

      <div class="content">{{ post.content }}</div>

      <div class="images" v-if="imageList.length">
        <img v-for="(img, i) in imageList" :key="i" :src="img" class="content-img" />
      </div>
      <div v-if="post.videoUrl" class="video-box">
        <video :src="post.videoUrl" controls class="video" />
      </div>

      <!-- 作者与互动 -->
      <div class="author-card" v-if="post.author">
        <div class="author-line">
          <img v-if="post.author.avatar" :src="post.author.avatar" class="author-avatar" />
          <div v-else class="author-avatar-placeholder">👤</div>
          <div class="author-info">
            <div class="author-name" @click="$router.push(`/user/${post.author.id}`)" style="cursor: pointer; color: #409eff;">
              {{ post.author.nickname }}
            </div>
            <div class="author-bio">{{ post.author.bio || '这个用户还没有简介' }}</div>
          </div>
          <el-button
            v-if="userStore.isLogin && userStore.userInfo?.id !== post.author.id"
            size="small"
            :type="post.followed ? 'info' : 'primary'"
            @click="toggleFollow"
          >
            {{ post.followed ? '已关注' : '+ 关注' }}
          </el-button>
        </div>
      </div>

      <div class="actions">
        <el-button :type="post.liked ? 'danger' : 'default'" @click="toggleLike">
          点赞 {{ post.likeCount }}
        </el-button>
        <el-button :type="post.favorited ? 'warning' : 'default'" @click="toggleFavorite">
          {{ post.favorited ? '已收藏' : '收藏' }} {{ post.favoriteCount }}
        </el-button>
        <el-button @click="reportDialog = true">举报</el-button>
      </div>

      <!-- 评论 -->
      <el-divider content-position="left">评论（{{ post.commentCount }}）</el-divider>

      <!-- 评论输入框 -->
      <div class="comment-input-box">
        <div v-if="userStore.isLogin" class="comment-form">
          <img v-if="userStore.userInfo?.avatar" :src="userStore.userInfo.avatar" class="user-mini-avatar" />
          <div v-else class="user-mini-avatar-placeholder">👤</div>
          <div class="input-wrapper">
            <el-input
              v-model="commentText"
              type="textarea"
              :rows="replyingTo ? 2 : 3"
              :placeholder="replyingTo ? '输入您的回复...' : '说说你的感受...'"
              maxlength="500"
              show-word-limit
              @keydown.ctrl.enter="submitComment()"
            />
            <div class="input-actions">
              <el-button v-if="replyingTo" link type="info" size="small" @click="cancelReply">取消回复</el-button>
              <el-button type="primary" size="small" :loading="submitting" @click="submitComment()">
                {{ replyingTo ? '回复' : '评论' }}
              </el-button>
            </div>
          </div>
        </div>
        <div v-else class="comment-tip">
          <el-icon><User /></el-icon>
          <span>登录后可发表评论</span>
        </div>
      </div>

      <!-- 评论列表 -->
      <div v-if="comments.length" class="comments-list">
        <div v-for="c in comments" :key="c.id" class="comment-item">
          <img v-if="c.author?.avatar" :src="c.author.avatar" class="comment-avatar" />
          <div v-else class="comment-avatar-placeholder">👤</div>

          <div class="comment-content-box">
            <div class="comment-header">
              <span class="comment-author" @click="$router.push(`/user/${c.userId}`)">
                {{ c.author?.nickname || `用户${c.userId}` }}
              </span>
              <span class="comment-time">{{ formatTime(c.createdAt) }}</span>
              <el-dropdown v-if="userStore.isLogin && userStore.userInfo?.id === c.userId" trigger="hover">
                <el-icon style="cursor: pointer;">
                  <MoreFilled />
                </el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="deleteComment(c)">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="comment-text">{{ c.content }}</div>

            <div class="comment-actions">
              <el-button link size="small" @click="replyTo(c)">
                <el-icon><ChatSquare /></el-icon> 回复
              </el-button>
              <el-button
                link
                size="small"
                :type="c.isLiked ? 'danger' : 'default'"
                @click="toggleCommentLike(c)"
              >
                <el-icon><Star /></el-icon> {{ c.likeCount }}
              </el-button>
            </div>

            <!-- 二级评论 -->
            <div v-if="c.replies && c.replies.length" class="replies-list">
              <div v-for="r in c.replies" :key="r.id" class="reply-item">
                <img v-if="r.author?.avatar" :src="r.author.avatar" class="reply-avatar" />
                <div v-else class="reply-avatar-placeholder">👤</div>

                <div class="reply-content-box">
                  <div class="reply-header">
                    <span class="reply-author" @click="$router.push(`/user/${r.userId}`)">
                      {{ r.author?.nickname || `用户${r.userId}` }}
                    </span>
                    <span v-if="r.replyUser" class="reply-to-user">
                      回复 <span @click="$router.push(`/user/${r.replyUser.id}`)">@{{ r.replyUser.nickname }}</span>
                    </span>
                    <span class="reply-time">{{ formatTime(r.createdAt) }}</span>
                  </div>
                  <div class="reply-text">{{ r.content }}</div>
                  <div class="reply-actions">
                    <el-button link size="small" @click="replyTo(r, c)">回复</el-button>
                    <el-button
                      link
                      size="small"
                      :type="r.isLiked ? 'danger' : 'default'"
                      @click="toggleCommentLike(r)"
                    >
                      <el-icon><Star /></el-icon> {{ r.likeCount }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无评论，快来评论第一条吧" />

      <!-- 举报弹窗 -->
      <el-dialog v-model="reportDialog" title="举报该游记" width="420px">
        <el-input v-model="reportReason" type="textarea" :rows="3" placeholder="请填写举报原因" />
        <template #footer>
          <el-button @click="reportDialog = false">取消</el-button>
          <el-button type="danger" @click="submitReport">提交举报</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, ChatSquare, Star, MoreFilled } from '@element-plus/icons-vue'
import TopNav from '../../components/TopNav.vue'
import request from '../../api/request'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const post = ref<any>({})
const comments = ref<any[]>([])
const commentText = ref('')
const replyingTo = ref<number>(0)
const replyingComment = ref<any>(null)
const reportDialog = ref(false)
const reportReason = ref('')
const submitting = ref(false)

const imageList = computed(() => {
  try {
    return JSON.parse(post.value.images || '[]');
  } catch {
    return [];
  }
});

function formatTime(t: string) {
  if (!t) return ''
  const date = new Date(t)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`

  return date.toLocaleDateString()
}

function needLogin() {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return true
  }
  return false
}

async function load() {
  try {
    post.value = await request.get(`/community/posts/${route.params.id}`)
  } catch {
    // 已提示
  }
  await loadComments()
}

async function loadComments() {
  try {
    comments.value = await request.get(`/community/posts/${route.params.id}/comments`)
  } catch {
    // 已提示
  }
}

async function toggleLike() {
  if (needLogin()) return
  try {
    const r: any = await request.post(`/community/posts/${post.value.id}/like`)
    post.value.isLiked = r.liked
    post.value.likeCount = r.likeCount
    ElMessage.success(r.liked ? '已点赞' : '已取消点赞')
  } catch (err) {
    console.error('点赞失败:', err)
  }
}

async function toggleFavorite() {
  if (needLogin()) return
  try {
    const r: any = await request.post(`/community/posts/${post.value.id}/favorite`)
    post.value.isFavorited = r.favorited
    post.value.favoriteCount = r.favoriteCount
    ElMessage.success(r.favorited ? '已收藏' : '已取消收藏')
  } catch (err) {
    console.error('收藏失败:', err)
  }
}

async function toggleFollow() {
  if (needLogin()) return
  try {
    const r: any = await request.post(`/user/${post.value.userId}/follow`)
    post.value.followed = r.following
    ElMessage.success(r.following ? '已关注' : '已取消关注')
  } catch (err) {
    console.error('关注失败:', err)
  }
}

function replyTo(c: any, parent?: any) {
  if (needLogin()) return
  replyingTo.value = c.id
  replyingComment.value = parent || c
  commentText.value = ''
}

function cancelReply() {
  replyingTo.value = 0
  replyingComment.value = null
  commentText.value = ''
}

async function submitComment() {
  if (needLogin()) return
  if (!commentText.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true
  try {
    await request.post(`/community/posts/${post.value.id}/comments`, {
      content: commentText.value,
      parentId: replyingTo.value || 0,
      replyUserId: replyingTo.value ? replyingComment.value.userId : undefined,
    })
    ElMessage.success('评论已发表')
    commentText.value = ''
    replyingTo.value = 0
    replyingComment.value = null
    await loadComments()
  } catch (err) {
    console.error('发表评论失败:', err)
  } finally {
    submitting.value = false
  }
}

async function deleteComment(c: any) {
  try {
    await request.post(`/community/comments/${c.id}/delete`)
    ElMessage.success('已删除')
    await loadComments()
  } catch (err) {
    console.error('删除失败:', err)
  }
}

async function toggleCommentLike(c: any) {
  if (needLogin()) return
  try {
    const r: any = await request.post(`/community/comments/${c.id}/like`)
    c.isLiked = r.liked
    c.likeCount = r.likeCount
  } catch (err) {
    console.error('点赞失败:', err)
  }
}

async function submitReport() {
  if (!reportReason.value.trim()) {
    ElMessage.warning('请填写举报原因')
    return
  }
  try {
    await request.post(`/community/posts/${post.value.id}/report`, {
      reason: reportReason.value,
    })
    ElMessage.success('举报已提交，平台会尽快处理')
    reportDialog.value = false
    reportReason.value = ''
  } catch (err) {
    console.error('举报失败:', err)
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px;
}
.head-meta {
  display: flex;
  gap: 16px;
  color: #999;
  font-size: 13px;
  margin-top: 10px;
}
.content {
  margin-top: 20px;
  line-height: 1.9;
  white-space: pre-wrap;
}
.images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.content-img {
  width: 200px;
  height: 150px;
  object-fit: cover;
  border-radius: 6px;
}
.video-box {
  margin-top: 16px;
}
.video {
  width: 100%;
  max-height: 400px;
  border-radius: 6px;
}
.author-card {
  margin-top: 20px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.author-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.author-avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
}

.author-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
  margin-bottom: 4px;
}

.author-bio {
  color: #999;
  font-size: 13px;
}

.comment-input-box {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.comment-form {
  display: flex;
  gap: 12px;
}

.user-mini-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-mini-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
}

.input-wrapper :deep(.el-textarea__inner) {
  border-radius: 4px;
  resize: none;
}

.input-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.comment-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 14px;
  padding: 16px;
}

.comments-list {
  margin-top: 24px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  cursor: pointer;
}

.comment-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.comment-content-box {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  cursor: pointer;

  &:hover {
    color: #409eff;
  }
}

.comment-time {
  color: #ccc;
  font-size: 12px;
  margin-left: auto;
}

.comment-text {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  margin: 8px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.replies-list {
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border-left: 3px solid #e8e8e8;
}

.reply-item {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.reply-item:last-child {
  margin-bottom: 0;
}

.reply-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  cursor: pointer;
}

.reply-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.reply-content-box {
  flex: 1;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}

.reply-author {
  font-weight: 600;
  color: #333;
  cursor: pointer;

  &:hover {
    color: #409eff;
  }
}

.reply-to-user {
  color: #999;

  span {
    color: #409eff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

.reply-time {
  color: #ccc;
  margin-left: auto;
}

.reply-text {
  color: #333;
  font-size: 13px;
  line-height: 1.6;
  margin: 4px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}
</style>
