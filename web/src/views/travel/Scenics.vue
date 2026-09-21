<template>
  <div class="scenics-page">
    <TopNav />

    <!-- 顶部 Banner -->
    <div class="hero-banner">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <span class="hero-tag">苗乡秘境</span>
        <h1 class="hero-title">景区门票</h1>
        <p class="hero-subtitle">畅游乌东美景，一键预订电子门票</p>
      </div>
    </div>

    <div class="page">
      <!-- 标题区 -->
      <div class="title-section">
        <h2 class="section-title">景区名录</h2>
        <p class="section-subtitle">精选乌东七大景区，从自然到人文</p>
        <div class="title-divider"></div>
      </div>

      <!-- 筛选/搜索栏 -->
      <div class="filter-bar">
        <div class="category-tabs">
          <button
            :class="['category-btn', { active: activeCategory === '' }]"
            @click="activeCategory = ''"
          >
            全部
          </button>
          <button
            :class="['category-btn', { active: activeCategory === 'nature' }]"
            @click="activeCategory = 'nature'"
          >
            自然景观
          </button>
          <button
            :class="['category-btn', { active: activeCategory === 'culture' }]"
            @click="activeCategory = 'culture'"
          >
            人文古寨
          </button>
          <button
            :class="['category-btn', { active: activeCategory === 'resort' }]"
            @click="activeCategory = 'resort'"
          >
            温泉度假
          </button>
        </div>
        <el-input
          v-model="keyword"
          placeholder="输入景区名称或地址"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-empty v-if="filteredScenics.length === 0" description="暂无匹配的景区" />

      <!-- 景区列表（左右交替大卡） -->
      <div v-else class="scenics-list">
        <div
          v-for="(scenic, index) in filteredScenics"
          :key="scenic.id"
          :class="['scenic-card-large', { reverse: index % 2 === 1 }]"
        >
          <!-- 图片侧 -->
          <div class="scenic-image-side" @click="$router.push(`/travel/scenic/${scenic.id}`)">
            <img :src="scenic.mainImage" class="scenic-image" />
            <span class="scenic-location-tag">{{ extractLocation(scenic.address) }}</span>
          </div>

          <!-- 文字侧 -->
          <div class="scenic-content-side">
            <span class="scenic-index">代表景区 {{ String(index + 1).padStart(2, '0') }}</span>
            <h3 class="scenic-name">{{ scenic.name }}</h3>
            <div class="scenic-meta">
              <span>{{ scenic.openTime || '08:00-18:00' }}</span>
              <span class="meta-separator">｜</span>
              <span>{{ scenic.category || '人文古寨' }}</span>
            </div>
            <p class="scenic-intro">{{ scenic.intro || '探索原生态苗寨风光，体验千年传承的苗族文化，感受梯田与吊脚楼交织的绝美景致。' }}</p>
            <button class="scenic-link" @click="$router.push(`/travel/scenic/${scenic.id}`)">查看详情 →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="page-footer">
      <div class="footer-content">
        <div class="footer-section">
          <h4 class="footer-logo">乌东文旅</h4>
          <p class="footer-desc">探索苗乡文化 · 体验非遗传承</p>
        </div>
        <div class="footer-section">
          <h5 class="footer-title">快速导航</h5>
          <div class="footer-links">
            <a href="/">首页</a>
            <a href="/clothing">非遗好物</a>
            <a href="/food">苗乡美食</a>
            <a href="/hotel">民宿住宿</a>
          </div>
        </div>
        <div class="footer-section">
          <h5 class="footer-title">关于我们</h5>
          <p class="footer-text">乌东文旅平台致力于传承苗族文化，推广乌东特色旅游资源，为游客提供一站式文旅服务体验。</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { Search } from '@element-plus/icons-vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const scenics = ref<any[]>([]);
const keyword = ref('');
const activeCategory = ref('');

// 从地址中提取所在地关键词
function extractLocation(address: string): string {
  if (!address) return '乌东';

  // 移除常见后缀词
  let location = address
    .replace(/^贵州省黔东南州?/, '')
    .replace(/^雷山县/, '')
    .replace(/国家森林公园|温泉度假区|风景区|手工艺体验馆|观景台|景区|镇|村|北侧山脊/g, '')
    .trim();

  // 如果提取后为空，返回默认
  if (!location) return '乌东';

  return location;
}

const filteredScenics = computed(() => {
  let result = scenics.value;

  if (keyword.value.trim()) {
    const kw = keyword.value.toLowerCase();
    result = result.filter((s: any) =>
      s.name.toLowerCase().includes(kw) || (s.address || '').toLowerCase().includes(kw)
    );
  }

  // 根据 category 分类过滤
  if (activeCategory.value) {
    const categoryMap: Record<string, string> = {
      'nature': '自然景观',
      'culture': '人文古寨',
      'resort': '温泉度假'
    };
    const targetCategory = categoryMap[activeCategory.value];
    if (targetCategory) {
      result = result.filter(s => s.category === targetCategory);
    }
  }

  return result;
});

onMounted(async () => {
  try {
    scenics.value = await request.get('/travel/scenics');
  } catch {
    // 错误已提示
  }
});
</script>

<style scoped>
.scenics-page {
  background: #FAFAF8;
  min-height: 100vh;
}

/* 顶部 Banner */
.hero-banner {
  width: 100%;
  height: 400px;
  background: #2C2C2C url('/uploads/banner/景区出行.jpg') center/cover;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 10%;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.hero-content {
  position: relative;
  z-index: 1;
  color: white;
  max-width: 600px;
}

.hero-tag {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(212, 160, 23, 0.9);
  color: white;
  font-size: 14px;
  border-radius: 20px;
  margin-bottom: 16px;
  font-weight: 500;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 12px 0;
  letter-spacing: 2px;
}

.hero-subtitle {
  font-size: 18px;
  margin: 0;
  opacity: 0.95;
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

/* 标题区 */
.title-section {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #2C2C2C;
  margin: 0 0 12px 0;
}

.section-subtitle {
  font-size: 14px;
  color: #888;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.title-divider {
  width: 60px;
  height: 3px;
  background: #D4A017;
  margin: 0 auto;
}

/* 筛选/搜索栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.category-tabs {
  display: flex;
  gap: 12px;
}

.category-btn {
  padding: 8px 20px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-btn:hover {
  border-color: #D4A017;
  color: #D4A017;
}

.category-btn.active {
  background: #D4A017;
  color: white;
  border-color: #D4A017;
}

.search-input {
  width: 320px;
}

/* 景区列表（左右交替大卡） */
.scenics-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.scenic-card-large {
  display: flex;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.scenic-card-large:hover {
  box-shadow: 0 8px 24px rgba(212, 160, 23, 0.15);
  transform: translateY(-4px);
}

.scenic-card-large.reverse {
  flex-direction: row-reverse;
}

/* 图片侧 */
.scenic-image-side {
  position: relative;
  width: 45%;
  cursor: pointer;
  overflow: hidden;
}

.scenic-image {
  width: 100%;
  height: 260px;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.scenic-card-large:hover .scenic-image {
  transform: scale(1.05);
}

.scenic-location-tag {
  position: absolute;
  bottom: 16px;
  left: 16px;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  border-radius: 4px;
}

/* 文字侧 */
.scenic-content-side {
  width: 55%;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.scenic-index {
  font-size: 12px;
  color: #D4A017;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.scenic-name {
  font-size: 28px;
  font-weight: 700;
  color: #2C2C2C;
  margin: 0 0 12px 0;
}

.scenic-meta {
  font-size: 14px;
  color: #888;
  margin-bottom: 16px;
  line-height: 1.6;
}

.meta-separator {
  margin: 0 8px;
}

.scenic-intro {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.scenic-link {
  color: #D4A017;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.3s ease;
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
}

.scenic-link:hover {
  color: #C09015;
}

/* 页脚 */
.page-footer {
  background: #2C2C2C;
  color: white;
  padding: 48px 0 32px;
  margin-top: 80px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-logo {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #D4A017;
}

.footer-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: white;
}

.footer-desc,
.footer-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s ease;
}

.footer-links a:hover {
  color: #D4A017;
}

/* 响应式 */
@media (max-width: 968px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .category-tabs {
    flex-wrap: wrap;
  }

  .search-input {
    width: 100%;
  }

  .scenic-card-large,
  .scenic-card-large.reverse {
    flex-direction: column;
  }

  .scenic-image-side,
  .scenic-content-side {
    width: 100%;
  }

  .scenic-image {
    height: 220px;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .hero-banner {
    padding-left: 5%;
  }

  .hero-title {
    font-size: 36px;
  }
}
</style>
