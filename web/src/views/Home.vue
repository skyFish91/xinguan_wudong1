<template>
  <div>
    <TopNav />

    <!-- 顶部 Banner -->
    <div class="hero-banner">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1 class="hero-title">乌东文旅</h1>
        <p class="hero-subtitle">寻味苗乡·栖居梯田</p>
      </div>
    </div>

    <div class="page">
      <!-- 五大功能入口 3+2 布局 -->
      <div class="portal-section">
        <!-- 第一排 3 张大卡片 -->
        <div class="portal-row-top">
          <div class="portal-card-large" @click="$router.push('/clothing')">
            <img src="/uploads/social-photos/heritage-craft.jpg" class="portal-bg" />
            <div class="portal-overlay"></div>
            <div class="portal-content">
              <h3 class="portal-title">非遗好物</h3>
              <p class="portal-desc">千年技艺，匠心传承</p>
              <span class="portal-arrow">→</span>
            </div>
          </div>
          <div class="portal-card-large" @click="$router.push('/food')">
            <img src="/uploads/social-photos/wudong-miao-village.jpg" class="portal-bg" />
            <div class="portal-overlay"></div>
            <div class="portal-content">
              <h3 class="portal-title">苗乡美食</h3>
              <p class="portal-desc">舌尖上的苗乡味道</p>
              <span class="portal-arrow">→</span>
            </div>
          </div>
          <div class="portal-card-large" @click="$router.push('/hotel')">
            <img src="/uploads/scenic-photos/西江千户苗寨.jpg" class="portal-bg" />
            <div class="portal-overlay"></div>
            <div class="portal-content">
              <h3 class="portal-title">民宿住宿</h3>
              <p class="portal-desc">诗意栖居，田园牧歌</p>
              <span class="portal-arrow">→</span>
            </div>
          </div>
        </div>

        <!-- 第二排 2 张宽卡片 -->
        <div class="portal-row-bottom">
          <div class="portal-card-wide" @click="$router.push('/travel')">
            <img src="/uploads/scenic-photos/西江千户苗寨.jpg" class="portal-img-left" />
            <div class="portal-text-right">
              <h3 class="portal-title-wide">景区出行</h3>
              <p class="portal-desc-wide">探索山水画卷，畅游自然风光</p>
              <a class="portal-link">去看看 →</a>
            </div>
          </div>
          <div class="portal-card-wide" @click="$router.push('/community')">
            <img src="/uploads/social-photos/wudong-miao-village.jpg" class="portal-img-left" />
            <div class="portal-text-right">
              <h3 class="portal-title-wide">社区分享</h3>
              <p class="portal-desc-wide">记录旅途故事，分享精彩瞬间</p>
              <a class="portal-link">去看看 →</a>
            </div>
          </div>
        </div>
      </div>

      <!-- 欢迎区 -->
      <div class="welcome-section">
        <h2 class="welcome-title">欢迎来到乌东文旅</h2>
        <p class="welcome-text">探索苗族非遗文化，体验原生态山水风光</p>
        <p class="welcome-text">在这里，您可以品味地道苗乡美食，入住特色民宿，畅游自然景区，感受千年传承的匠心技艺</p>
      </div>

      <!-- 三栏内容区 -->
      <div class="content-three-cols">
        <!-- 左：热门资讯 -->
        <div class="col-card">
          <h3 class="col-title">
            <span class="col-icon">📰</span>
            热门资讯
          </h3>
          <ul class="info-list">
            <li class="info-item">西江千户苗寨入选国家5A景区</li>
            <li class="info-item">苗绣技艺荣获国家级非遗认证</li>
            <li class="info-item">乌东文旅平台正式上线运营</li>
            <li class="info-item">春节特惠活动火热进行中</li>
            <li class="info-item">民宿预订享受满减优惠</li>
          </ul>
        </div>

        <!-- 中：今日推荐 -->
        <div class="col-card">
          <h3 class="col-title">
            <span class="col-icon">⭐</span>
            今日推荐
          </h3>
          <div class="recommend-grid">
            <div class="recommend-item">
              <img src="/uploads/social-photos/heritage-craft.jpg" class="recommend-img" />
            </div>
            <div class="recommend-item">
              <img src="/uploads/scenic-photos/西江千户苗寨.jpg" class="recommend-img" />
            </div>
            <div class="recommend-item">
              <img src="/uploads/social-photos/wudong-miao-village.jpg" class="recommend-img" />
            </div>
            <div class="recommend-item">
              <img src="/uploads/social-photos/heritage-craft.jpg" class="recommend-img" />
            </div>
          </div>
        </div>

        <!-- 右：最新动态 -->
        <div class="col-card">
          <h3 class="col-title">
            <span class="col-icon">🔥</span>
            最新动态
          </h3>
          <ul class="activity-list">
            <li class="activity-item">
              <img src="/uploads/social-photos/heritage-craft.jpg" class="activity-thumb" />
              <span class="activity-text">用户小明分享了游记</span>
            </li>
            <li class="activity-item">
              <img src="/uploads/scenic-photos/西江千户苗寨.jpg" class="activity-thumb" />
              <span class="activity-text">新增民宿「山间小筑」</span>
            </li>
            <li class="activity-item">
              <img src="/uploads/social-photos/wudong-miao-village.jpg" class="activity-thumb" />
              <span class="activity-text">景区票务系统上线</span>
            </li>
            <li class="activity-item">
              <img src="/uploads/social-photos/heritage-craft.jpg" class="activity-thumb" />
              <span class="activity-text">非遗商品热卖中</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 公告 -->
      <el-alert
        v-for="a in home.announcements"
        :key="a.id"
        :title="a.title"
        type="info"
        :closable="false"
        class="announce"
      />

      <!-- 活动横幅 -->
      <div v-if="home.activities?.length" class="activities">
        <img v-for="a in home.activities" :key="a.id" :src="a.imageUrl" class="activity-img" />
      </div>

      <!-- 热门非遗商品 -->
      <el-divider content-position="left">热门非遗好物</el-divider>
      <div class="grid">
        <el-card v-for="p in home.hotProducts" :key="p.id" class="item-card" shadow="hover" @click="$router.push(`/clothing/${p.id}`)">
          <img :src="p.mainImage" class="item-img" />
          <div class="item-title">{{ p.title }}</div>
          <div class="item-price">¥{{ p.price }}</div>
        </el-card>
      </div>

      <!-- 热门民宿 -->
      <el-divider content-position="left">热门民宿</el-divider>
      <div class="grid">
        <el-card v-for="h in home.hotHomestays" :key="h.id" class="item-card" shadow="hover" @click="$router.push(`/hotel/${h.id}`)">
          <img :src="h.mainImage" class="item-img" />
          <div class="item-title">{{ h.name }}</div>
          <div class="item-price">¥{{ h.minPrice }} 起/晚</div>
        </el-card>
      </div>

      <!-- 热门游记 -->
      <el-divider content-position="left">社区热帖</el-divider>
      <div class="posts">
        <div v-for="p in home.hotPosts" :key="p.id" class="post-row" @click="$router.push(`/community/${p.id}`)">
          <img v-if="p.images" :src="String(p.images).split(',')[0]" class="post-img" />
          <div>
            <div class="post-title">{{ p.title }}</div>
            <div class="post-meta">赞 {{ p.likeCount }} · 评论 {{ p.commentCount }} · 浏览 {{ p.viewCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>&copy; 2026 乌东文旅平台 版权所有</p>
        <p>探索苗乡文化 | 体验非遗传承 | 感受山水人文</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import TopNav from '../components/TopNav.vue';
import request from '../api/request';

const home = reactive<any>({ banners: [], announcements: [], activities: [], hotProducts: [], hotHomestays: [], hotRoutes: [], hotPosts: [] });

onMounted(async () => {
  try {
    const data: any = await request.get('/home');
    Object.assign(home, data);
  } catch {
    // 提示已由拦截器统一处理
  }
});
</script>

<style scoped>
/* Banner */
.hero-banner {
  width: 100%;
  height: 400px;
  background: #2C2C2C;
  background-image: url('/uploads/banner/主页1.jpg');
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  margin: 0 0 16px 0;
  letter-spacing: 4px;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 24px;
  margin: 0;
  font-weight: 300;
  letter-spacing: 2px;
  opacity: 0.95;
}

.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px 80px;
  background: #FAFAF8;
}

/* 五大入口 */
.portal-section {
  padding: 60px 0;
  background: #FAFAF8;
}

/* 第一排 3 张大卡片 */
.portal-row-top {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.portal-card-large {
  position: relative;
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.portal-card-large:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(212, 160, 23, 0.2);
}

.portal-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.portal-card-large:hover .portal-bg {
  transform: scale(1.05);
}

.portal-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.75) 100%);
}

.portal-content {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  padding: 0 24px;
  color: white;
  z-index: 1;
}

.portal-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
  color: white;
}

.portal-desc {
  font-size: 13px;
  margin: 0 0 8px 0;
  color: white;
  opacity: 0.95;
}

.portal-arrow {
  font-size: 18px;
  color: #D4A017;
}

/* 第二排 2 张宽卡片 */
.portal-row-bottom {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.portal-card-wide {
  display: flex;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  background: #FFFFFF;
  border: 1px solid #eee;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.portal-card-wide:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(212, 160, 23, 0.15);
  border-color: #D4A017;
}

.portal-img-left {
  width: 40%;
  height: 100%;
  object-fit: cover;
  flex-shrink: 0;
}

.portal-text-right {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.portal-title-wide {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #2C2C2C;
}

.portal-desc-wide {
  font-size: 14px;
  color: #888;
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.portal-link {
  color: #D4A017;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s ease;
}

.portal-link:hover {
  color: #C09015;
}

/* 响应式 */
@media (max-width: 968px) {
  .portal-row-top {
    grid-template-columns: 1fr;
  }

  .portal-row-bottom {
    grid-template-columns: 1fr;
  }

  .content-three-cols {
    grid-template-columns: 1fr;
  }
}

/* 欢迎区 */
.welcome-section {
  background: #FFFFFF;
  padding: 48px 32px;
  text-align: center;
  margin: 0 -32px 40px;
  border-top: 3px solid #D4A017;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  color: #2C2C2C;
  margin: 0 0 16px 0;
}

.welcome-text {
  font-size: 14px;
  color: #888;
  line-height: 1.6;
  margin: 8px 0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

/* 三栏内容区 */
.content-three-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.col-card {
  background: #FFFFFF;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.col-title {
  font-size: 20px;
  font-weight: 700;
  color: #2C2C2C;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.col-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  background: #D4A017;
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 左栏：热门资讯 */
.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-item {
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  padding-left: 20px;
}

.info-item::before {
  content: '●';
  position: absolute;
  left: 0;
  color: #D4A017;
  font-size: 10px;
  top: 15px;
}

.info-item:hover {
  color: #D4A017;
  padding-left: 24px;
}

.info-item:last-child {
  border-bottom: none;
}

/* 中栏：今日推荐 */
.recommend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.recommend-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.recommend-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(212, 160, 23, 0.2);
}

.recommend-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 右栏：最新动态 */
.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.activity-item:hover {
  background: #fafafa;
  padding-left: 8px;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.activity-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

/* 页脚 */
.footer {
  background: #2C2C2C;
  color: white;
  padding: 32px 0;
  text-align: center;
}

.footer-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
}

.footer-content p {
  margin: 8px 0;
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.6;
}

.announce {
  margin-top: 16px;
  border-radius: 12px;
  border-left: 4px solid #D4A017;
}

.activities {
  margin: 24px 0 32px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.activity-img {
  height: 140px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.activity-img:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(212, 160, 23, 0.15);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.item-card {
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.item-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 28px rgba(212, 160, 23, 0.2);
  border-color: #D4A017;
}

.item-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.item-card:hover .item-img {
  transform: scale(1.1);
}

.item-card :deep(.el-card__body) {
  padding: 18px;
}

.item-title {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

.item-price {
  margin-top: 8px;
  color: #b8860b;
  font-weight: 800;
  font-size: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: -0.5px;
}

.posts {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.post-row {
  display: flex;
  gap: 16px;
  cursor: pointer;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.post-row:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #e0e0e0;
}

.post-img {
  width: 100px;
  height: 75px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.post-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px;
  line-height: 1.5;
}

.post-meta {
  font-size: 13px;
  color: #95a5a6;
}

:deep(.el-divider__text) {
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
  background: #fff;
  padding: 0 20px;
}

:deep(.el-divider) {
  margin: 40px 0 28px;
}
</style>
