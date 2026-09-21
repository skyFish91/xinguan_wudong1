<template>
  <div class="community-home">
    <TopNav />

    <!-- 头部大图区 -->
    <section class="hero-section">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1 class="hero-title">发现乌东之美</h1>
        <p class="hero-subtitle">分享你的故事，探索他人的旅程</p>
        <div class="hero-actions">
          <el-button size="large" type="primary" round @click="$router.push('/community/publish')">
            <el-icon><EditPen /></el-icon> 发布游记
          </el-button>
          <el-button size="large" round @click="scrollToExplore">
            <el-icon><Search /></el-icon> 浏览发现
          </el-button>
        </div>
      </div>
    </section>

    <div class="content-container">
      <!-- 快速入口卡片 -->
      <section class="quick-entry">
        <div class="entry-card" @click="$router.push('/community/feed')">
          <div class="entry-icon">📖</div>
          <h3 class="entry-title">浏览游记</h3>
          <p class="entry-desc">发现更多精彩旅行故事</p>
          <div class="entry-arrow">→</div>
        </div>
        <div class="entry-card" @click="$router.push('/community/topics')">
          <div class="entry-icon">🏷️</div>
          <h3 class="entry-title">热门话题</h3>
          <p class="entry-desc">探索感兴趣的话题内容</p>
          <div class="entry-arrow">→</div>
        </div>
      </section>

      <!-- 热门话题区 -->
      <section class="topics-section" ref="topicsSection">
        <div class="section-header">
          <h2 class="section-title">🔥 热门话题</h2>
          <p class="section-desc">探索感兴趣的内容</p>
        </div>
        <div class="topics-grid">
          <div
            v-for="topic in hotTopics"
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
            <div class="topic-info">
              <h3 class="topic-name">#{{ topic.name }}</h3>
              <p class="topic-intro">{{ topic.intro }}</p>
              <div class="topic-stats">
                <span>{{ topic.postCount }} 篇游记</span>
                <span>{{ topic.followCount }} 关注</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 精选游记照片墙 -->
      <section class="gallery-section" ref="gallerySection">
        <div class="section-header">
          <h2 class="section-title">📸 精彩瞬间</h2>
          <el-button text type="primary" @click="$router.push('/community/feed')">
            查看更多 →
          </el-button>
        </div>
        <div v-if="loading" class="loading-wrapper">
          <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        </div>
        <div v-else-if="galleryPosts.length" class="photo-gallery">
          <div
            v-for="(post, idx) in galleryPosts"
            :key="post.id"
            class="gallery-item"
            :class="`size-${getSizeForIndex(idx)}`"
            @click="$router.push(`/community/${post.id}`)"
          >
            <img :src="getFirstImage(post)" class="gallery-img" />
            <div class="gallery-overlay">
              <div class="overlay-content">
                <h4 class="overlay-title">{{ post.title }}</h4>
                <div class="overlay-author">
                  <img
                    v-if="post.author?.avatar"
                    :src="post.author.avatar"
                    class="author-avatar-small"
                  />
                  <span>{{ post.author?.nickname || '匿名用户' }}</span>
                </div>
                <div class="overlay-stats">
                  <span><el-icon><View /></el-icon> {{ post.viewCount }}</span>
                  <span><el-icon><Star /></el-icon> {{ post.likeCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无精彩内容" />
      </section>

      <!-- CTA区域 -->
      <section class="cta-section">
        <div class="cta-card">
          <div class="cta-background-pattern"></div>
          <div class="cta-content">
            <div class="cta-icon-group">
              <span class="cta-icon-item">📸</span>
              <span class="cta-icon-item main">✨</span>
              <span class="cta-icon-item">🎨</span>
            </div>
            <h3 class="cta-title">开始你的创作之旅</h3>
            <p class="cta-desc">记录旅途中的美好时刻，与更多人分享你的故事</p>
            <div class="cta-features">
              <div class="feature-item">
                <div class="feature-icon">📝</div>
                <div class="feature-text">撰写游记</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📷</div>
                <div class="feature-text">分享照片</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">💬</div>
                <div class="feature-text">交流互动</div>
              </div>
            </div>
            <el-button size="large" type="primary" round class="cta-button" @click="$router.push('/community/publish')">
              立即发布游记
            </el-button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { EditPen, Search, Loading, View, Star } from '@element-plus/icons-vue'
import TopNav from '../../components/TopNav.vue'
import request from '../../api/request'

const hotTopics = ref<any[]>([])
const galleryPosts = ref<any[]>([])
const loading = ref(false)
const topicsSection = ref<HTMLElement>()
const gallerySection = ref<HTMLElement>()

onMounted(async () => {
  loading.value = true
  try {
    // 加载热门话题
    const topics = await request.get('/community/topics')
    hotTopics.value = (Array.isArray(topics) ? topics : topics.list || []).slice(0, 8)

    // 加载精选游记（取前12篇）
    const postsData: any = await request.get('/community/posts', {
      params: { tab: 'hot', pageSize: 12 },
    })
    const allPosts = postsData.list || []
    galleryPosts.value = allPosts.filter((p: any) => getFirstImage(p))
  } catch (err) {
    console.error(err)
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

function getFirstImage(post: any) {
  if (!post.images) return ''
  try {
    const imgs = Array.isArray(post.images) ? post.images : JSON.parse(post.images || '[]')
    return imgs[0] || ''
  } catch {
    return ''
  }
}

function getSizeForIndex(idx: number) {
  // 创建更有趣的瀑布流布局
  const pattern = ['medium', 'small', 'large', 'small', 'medium', 'small', 'small', 'large', 'medium', 'small', 'medium', 'small']
  return pattern[idx % pattern.length]
}

function scrollToExplore() {
  topicsSection.value?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToTopics() {
  topicsSection.value?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToGallery() {
  gallerySection.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.community-home {
  min-height: 100vh;
  background: #f8f9fa;
}

/* 头部大图区 */
.hero-section {
  position: relative;
  height: 450px;
  background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)), url('/uploads/banner/社区.jpg');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 3px solid #d4a574;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><path d="M0,100 Q300,200 600,100 T1200,100 L1200,600 L0,600 Z" fill="rgba(255,255,255,0.05)"/></svg>')
    no-repeat bottom;
  background-size: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
  padding: 20px;
}

.hero-title {
  font-size: 56px;
  font-weight: bold;
  margin: 0 0 16px 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: fadeInUp 0.8s ease-out;
}

.hero-subtitle {
  font-size: 20px;
  margin: 0 0 40px 0;
  opacity: 0.95;
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  animation: fadeInUp 0.8s ease-out 0.4s both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 内容容器 */
.content-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 60px 20px;
}

/* 快速入口卡片 */
.quick-entry {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin-bottom: 80px;
}

.entry-card {
  background: white;
  border-radius: 0;
  padding: 48px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.entry-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.entry-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.entry-card:hover::before {
  transform: scaleX(1);
}

.entry-card:hover::after {
  opacity: 1;
}

.entry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.entry-icon {
  font-size: 72px;
  margin-bottom: 20px;
  filter: grayscale(0.2);
  transition: all 0.3s;
}

.entry-card:hover .entry-icon {
  filter: grayscale(0);
  transform: scale(1.1);
}

.entry-title {
  margin: 0 0 12px 0;
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.entry-desc {
  margin: 0 0 20px 0;
  font-size: 15px;
  color: #666;
  line-height: 1.6;
}

.entry-arrow {
  font-size: 28px;
  color: #667eea;
  font-weight: bold;
  transition: transform 0.3s;
}

.entry-card:hover .entry-arrow {
  transform: translateX(8px);
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.section-desc {
  margin: 0;
  font-size: 16px;
  color: #909399;
}

/* 话题网格 */
.topics-section {
  margin-bottom: 80px;
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.topic-card {
  background: white;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
}

.topic-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border-color: #667eea;
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

.topic-info {
  padding: 20px;
}

.topic-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.topic-intro {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

/* 照片墙 */
.gallery-section {
  margin-bottom: 80px;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  padding: 60px 0;
  color: #909399;
}

.photo-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  grid-auto-flow: dense;
}

.gallery-item {
  position: relative;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  background: #f5f5f5;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e8e8e8;
}

.gallery-item.size-small {
  grid-row: span 1;
}

.gallery-item.size-medium {
  grid-row: span 2;
}

.gallery-item.size-large {
  grid-row: span 2;
  grid-column: span 2;
}

.gallery-item:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1;
  border-color: #667eea;
}

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  min-height: 200px;
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  padding: 20px;
}

.gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.overlay-content {
  color: white;
  width: 100%;
}

.overlay-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.overlay-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.author-avatar-small {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.overlay-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  opacity: 0.9;
}

.overlay-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* CTA区域 */
.cta-section {
  margin-bottom: 40px;
}

.cta-card {
  background: linear-gradient(135deg, #D4A017 0%, #C09015 100%);
  border-radius: 24px;
  padding: 80px 40px;
  text-align: center;
  color: white;
  box-shadow: 0 12px 48px rgba(212, 160, 23, 0.3);
  position: relative;
  overflow: hidden;
}

.cta-background-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  opacity: 0.8;
}

.cta-background-pattern::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 40px,
    rgba(255, 255, 255, 0.03) 40px,
    rgba(255, 255, 255, 0.03) 80px
  );
}

.cta-content {
  position: relative;
  z-index: 1;
}

.cta-icon-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.cta-icon-item {
  font-size: 48px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
  transition: all 0.3s ease;
  opacity: 0.7;
}

.cta-icon-item.main {
  font-size: 72px;
  opacity: 1;
  animation: float 3s ease-in-out infinite;
}

.cta-icon-item:not(.main):hover {
  transform: scale(1.2) rotate(10deg);
  opacity: 1;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.cta-title {
  margin: 0 0 16px 0;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.cta-desc {
  margin: 0 0 40px 0;
  font-size: 18px;
  opacity: 0.95;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.cta-features {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 40px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
}

.feature-text {
  font-size: 15px;
  font-weight: 500;
  opacity: 0.95;
  letter-spacing: 0.5px;
}

.cta-button {
  font-size: 16px;
  padding: 16px 48px;
  height: auto;
  background: white;
  color: #D4A017;
  border: none;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  background: white;
  color: #D4A017;
}

/* 响应式 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .section-title {
    font-size: 24px;
  }

  .topics-grid {
    grid-template-columns: 1fr;
  }

  .photo-gallery {
    grid-template-columns: repeat(2, 1fr);
  }

  .gallery-item.size-large {
    grid-column: span 1;
  }

  .content-container {
    padding: 40px 16px;
  }
}
</style>
