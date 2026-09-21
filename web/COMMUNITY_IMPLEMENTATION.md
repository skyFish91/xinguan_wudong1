---
name: community_implementation
description: 乌东文旅平台社区功能实现总结
metadata:
  type: project
---

## 已实现的社区模块功能

### 1. 社区首页 (Community Home)
**文件**: `/web/src/views/community/Home.vue`

**功能特性**：
- ✓ 顶部 Banner 展示平台介绍和行动按钮
- ✓ 统计数据展示（游记数、话题数、活跃用户、社区互动）
- ✓ 热门话题展示（最多 12 个，可点击跳转）
- ✓ 推荐游记展示（通过 /community/posts API 加载热门内容）
- ✓ 社区规则说明
- ✓ 完整响应式设计

**API 调用**：
- GET `/community/topics` - 获取热门话题列表
- GET `/community/posts?page=1&pageSize=6&tab=hot` - 获取热门推荐游记

**路由**: `/community`

---

### 2. 游记列表 / Feed (Community Feed)
**文件**: `/web/src/views/community/Feed.vue` (已有，增强了功能)

**功能特性**：
- ✓ 话题标签过滤
- ✓ 最新 / 热门 / 关注 三种视图切换
- ✓ 游记卡片展示（标题、内容摘要、作者、发布时间、互动数据）
- ✓ 分页加载
- ✓ 关注用户内容需要登录提示

**API 调用**：
- GET `/community/posts?tab=all|hot|follow&topicId=X&page=Y&pageSize=Z` - 获取游记列表
- GET `/community/topics` - 获取可用话题列表

**路由**: `/community/feed`

---

### 3. 话题列表页面 (Topics Page)
**文件**: `/web/src/views/community/Topics.vue`

**功能特性**：
- ✓ 话题搜索功能
- ✓ 按热度 / 最新 / 关注数 排序
- ✓ 话题卡片展示（名称、描述、关注数、讨论数）
- ✓ 关注 / 取消关注话题按钮
- ✓ 点击话题跳转到该话题下的游记列表
- ✓ 分页展示

**API 调用**：
- GET `/community/topics?search=keyword&sortBy=latest|hot|followers&page=Y&pageSize=Z` - 获取话题列表
- POST `/community/topics/{id}/follow` - 关注话题

**路由**: `/community/topics`

---

### 4. 搜索页面 (Search Page)
**文件**: `/web/src/views/community/Search.vue`

**功能特性**：
- ✓ 全局搜索框（搜索游记、话题、用户）
- ✓ 搜索类型过滤（全部 / 游记 / 话题 / 用户）
- ✓ 排序方式选择（最新 / 热度 / 赞数）
- ✓ 日期范围筛选
- ✓ 搜索结果展示（按类型分组）
- ✓ 搜索耗时显示
- ✓ 结果分页

**API 调用**：
- GET `/community/search?keyword=X&type=all|posts|topics|users&sortBy=latest|hot|likes&startDate=Y&endDate=Z&page=P&pageSize=S` - 执行搜索

**路由**: `/community/search?q=keyword`

---

### 5. 发布游记 (Publish Post)
**文件**: `/web/src/views/community/Publish.vue` (已有，保持现有功能)

**功能特性**：
- ✓ 标题输入
- ✓ 内容编辑（支持最多 5000 字）
- ✓ 话题选择（多选）
- ✓ 图片上传（支持最多 9 张，单张不超过 5MB）
- ✓ 视频链接（可选）
- ✓ 内容审核提示

**API 调用**：
- GET `/community/topics` - 获取可用话题列表
- POST `/upload/file` - 上传图片
- POST `/community/posts` - 发布游记

**路由**: `/community/publish` (需要登录)

---

### 6. 游记详情页面 (Post Detail)
**文件**: `/web/src/views/community/PostDetail.vue` (已有)

**功能特性**：
- ✓ 游记完整内容展示
- ✓ 作者信息
- ✓ 评论功能
- ✓ 点赞 / 收藏功能
- ✓ 相关推荐

**路由**: `/community/:id`

---

## 参考实现思路

本实现参考了参考项目 `/d/workspace/ClaudeCode/xinguan_wudong/code/web/src/views/community` 的以下核心思路：

1. **首页设计**：展示平台亮点、热门内容、用户导引
2. **话题系统**：支持话题关注、话题聚合、话题搜索
3. **游记展示**：卡片式布局、多维度排序、内容摘要
4. **搜索功能**：多维度搜索、高级筛选、结果聚合
5. **用户交互**：关注 / 点赞 / 评论等基本交互
6. **登录鉴权**：发布、评论等敏感操作需要登录
7. **响应式设计**：适配 PC 和移动设备

---

## 接口约定

所有接口使用以下统一规范：

**基础 URL**: `http://localhost:5173/api`

**认证方式**: 请求头 `Authorization: Bearer {token}`

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

**错误处理**：
- 若 code !== 0，前端自动提示 message 并进行错误处理
- 若 code = 1001 或 1002（认证失败），跳转到登录页

---

## 数据结构

### 游记对象 (Post)
```ts
{
  id: number,
  title: string,
  content: string,
  images: string, // JSON 数组字符串 ["url1", "url2"]
  videoUrl?: string,
  topicId?: number,
  author: {
    nickname: string,
    avatar?: string
  },
  likeCount: number,
  commentCount: number,
  viewCount: number,
  isHot: boolean,
  createdAt: string,
  publishedAt: string
}
```

### 话题对象 (Topic)
```ts
{
  id: number,
  name: string,
  description?: string,
  icon?: string,
  followerCount: number,
  postCount: number,
  isFollowing: boolean
}
```

### 用户对象 (User)
```ts
{
  id: number,
  nickname: string,
  avatar?: string,
  bio?: string,
  followerCount: number
}
```

---

## 测试访问路径

1. **社区首页**: http://localhost:5173/community
2. **游记列表**: http://localhost:5173/community/feed
3. **话题列表**: http://localhost:5173/community/topics
4. **搜索页面**: http://localhost:5173/community/search
5. **发布游记**: http://localhost:5173/community/publish (需登录)
6. **游记详情**: http://localhost:5173/community/1 (示例 ID)

---

## 后续开发建议

1. 实现后端 API 接口（基于当前统一响应规范）
2. 添加评论系统组件
3. 实现用户关注 / 粉丝功能
4. 添加内容审核提示
5. 优化图片上传和预加载
6. 实现富文本编辑器（发布游记）
7. 添加游记分享功能（分享到社交媒体）
8. 实现社区推荐算法
