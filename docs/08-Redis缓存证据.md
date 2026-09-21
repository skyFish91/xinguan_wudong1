# Redis 缓存优化与证据记录

> 对应课程第 3 天（9 月 9 日）核心产出
> 文档版本：V1.0 ｜ 编制日期：2026-09-09 ｜ 设计人：唐晶

## 一、Redis 使用总览

### 1.1 连接配置

Redis 连接配置位于 `server/src/config/config.default.ts` 第 31-38 行，全部支持环境变量覆盖，缺省值用于本地开发：

| 配置项 | 环境变量 | 缺省值 |
|--------|----------|--------|
| 主机 | `REDIS_HOST` | 127.0.0.1 |
| 端口 | `REDIS_PORT` | 6379 |
| 密码 | `REDIS_PASSWORD` | undefined（本地无密码） |
| 数据库编号 | `REDIS_DB` | 0 |

```typescript
redis: {
  client: {
    port: Number(process.env.REDIS_PORT || 6379),
    host: process.env.REDIS_HOST || '127.0.0.1',
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
  },
},
```

### 1.2 客户端组件

- 使用 Midway 官方组件 `@midwayjs/redis`，在 `server/src/configuration.ts` 第 4 行引入、第 43 行注册进 `imports` 数组，应用启动时自动创建连接池并注入 `RedisService`。
- 全项目共 5 个 Service 注入 `RedisService`：
  - `server/src/module/auth/auth.service.ts:29`
  - `server/src/module/clothing/clothing.service.ts:41`
  - `server/src/module/home/home.module.ts:46`
  - `server/src/module/travel/travel.module.ts:72`
  - `server/src/module/admin/admin.module.ts:85`
- 其余模块（食、住、社区、购物车、订单、支付等）未使用 Redis。

## 二、缓存点明细表

| 缓存 Key | 用途 | 过期策略 | 失效时机 | 代码位置（文件:行号） |
|----------|------|----------|----------|----------------------|
| `sms:code:{phone}` | 短信验证码（开发期固定 123456） | EX 300 秒 | 1. 校验通过后立即 `del`（一次性使用）；2. 300 秒 TTL 自然过期 | 写入 `server/src/module/auth/auth.service.ts:40`；读取 `:47`；删除 `:51` |
| `home:data` | 首页聚合（Banner/活动横幅/公告/推荐位展开后的热销商品、民宿、路线、热门帖子） | EX 300 秒 | 运营配置变更时主动 `del`（9 处调用，见 2.2）；另有 300 秒 TTL 兜底 | 读取 `server/src/module/home/home.module.ts:51-54`；写入 `:88`；清除方法 `:93-95` |
| `product:detail:{id}` | 商品详情聚合（商品 + SKU + 图片 + 传承人 + 前 20 条评价） | EX 600 秒 | 仅 TTL 自然过期，无主动失效 | Key 定义 `server/src/module/clothing/clothing.service.ts:107`；读取 `:108-111`；写入 `:134` |
| `travel:routes:{days}:{theme}:{keyword}:{page}` | 路线列表（按天数/主题/关键词筛选 + 分页） | EX 300 秒 | 仅 TTL 自然过期，无主动失效 | Key 定义 `server/src/module/travel/travel.module.ts:123`；读取 `:124-127`；写入 `:144` |

缓存 Key 与接口的对应关系：

| 缓存 Key | 触发接口 |
|----------|----------|
| `sms:code:{phone}` | `POST /api/auth/sms-code`（`server/src/module/auth/auth.controller.ts:15-17`） |
| `home:data` | `GET /api/home/`（`server/src/module/home/home.module.ts:105-107`） |
| `product:detail:{id}` | `GET /api/clothing/products/:id`（`server/src/module/clothing/clothing.controller.ts:56-58`） |
| `travel:routes:{days}:{theme}:{keyword}:{page}` | `GET /api/travel/routes`（`server/src/module/travel/travel.module.ts:296-305`） |

### 2.1 各缓存点代码要点

**验证码 `sms:code:{phone}`**（auth.service.ts）

- 发送：`await this.redis.set(`sms:code:${phone}`, code, 'EX', 300);`（第 40 行）
- 校验：`await this.redis.get(...)`，比对失败抛出"验证码错误或已过期"（第 47-50 行）
- 校验成功后立即 `del`，保证验证码一次性使用（第 51 行）

**首页聚合 `home:data`**（home.module.ts）

- 读缓存命中则直接返回（第 51-54 行）
- 未命中时并发查 8 个仓库（Banner、活动、公告、推荐位、商品、民宿、路线、帖子），聚合后写缓存（第 56-88 行）
- 提供 `clearCache()` 供运营配置变更时调用（第 93-95 行）

**商品详情 `product:detail:{id}`**（clothing.service.ts）

- 读缓存命中则直接返回（第 108-111 行）
- 未命中时用 `Promise.all` 并发查 5 个数据源（SKU、图片、传承人、评价 + 商品本身），聚合后写缓存（第 112-134 行）
- 商品不存在时抛 `BizError.notFound`，不写缓存

**路线列表 `travel:routes:{days}:{theme}:{keyword}:{page}`**（travel.module.ts）

- Key 由 days（缺省 0）、theme（缺省空串）、keyword（缺省空串）、page 拼成（第 123 行）
- 读缓存命中则直接返回（第 124-127 行）；未命中时查库后写缓存（第 144 行）
- 演进记录：初版 Key 未包含 keyword 维度，带关键词搜索与不带关键词浏览会互相命中缓存串数据（测试编写时发现），已修复为四段 Key，并有用例保护（travel.service.test.ts"关键词维度隔离缓存"）

### 2.2 `home:data` 的主动失效调用点

`server/src/module/admin/admin.module.ts` 中定义私有方法 `clearHomeCache()`（第 88-90 行），运营配置变更后统一删除首页缓存，共 9 处调用：

| 运营操作 | 调用行号 |
|----------|----------|
| 保存轮播图 saveBanner | admin.module.ts:290 |
| 删除轮播图 deleteBanner | admin.module.ts:300 |
| 轮播图上下架 toggleBanner | admin.module.ts:311 |
| 保存活动横幅 saveActivity | admin.module.ts:327 |
| 删除活动横幅 deleteActivity | admin.module.ts:337 |
| 保存公告 saveAnnouncement | admin.module.ts:353 |
| 删除公告 deleteAnnouncement | admin.module.ts:363 |
| 保存推荐位 saveRecommend | admin.module.ts:379 |
| 删除推荐位 deleteRecommend | admin.module.ts:385 |

## 三、缓存策略说明

### 3.1 为什么这些数据适合缓存（读多写少）

- 首页聚合：一次请求要并发查询 8 个数据仓库、并对推荐位做跨 3 个业务模块的展开查询（home.module.ts:56-77），是全站访问频率最高的接口；轮播图、公告等内容由运营低频变更，天然读多写少。
- 商品详情：一次请求聚合 5 个数据源（SKU、图片、传承人、评价、商品主表），商品信息相对稳定，评价最多取 20 条且变化不频繁。
- 路线列表：带筛选的列表查询，销量排序字段变化慢，同一筛选条件会被多个用户重复请求。
- 验证码：不属于读多写少场景，缓存的目的是"临时状态存储"——用 Redis 的 TTL 天然实现验证码 5 分钟有效期与一次性消费。

### 3.2 TTL 选择理由

- `home:data` 300 秒：运营内容希望变更后较快生效，5 分钟 TTL 与主动失效机制配合，保证最迟 5 分钟内自动刷新。
- `product:detail` 600 秒：无主动失效机制，取稍长的 10 分钟减少回源次数；10 分钟内商品信息变化的业务影响可接受。
- `travel:routes` 300 秒：列表按销量（sales）倒序，数据会随购买行为变化，较短 TTL 兼顾命中率与新鲜度。
- `sms:code` 300 秒：与验证码业务有效期一致，5 分钟未使用自动作废。

### 3.3 缓存穿透 / 击穿 / 雪崩的应对情况（如实说明）

- 穿透：未做空值缓存、未用布隆过滤器。商品详情对不存在的商品抛业务异常且不写缓存（clothing.service.ts:113-115），极端情况下大量不存在 id 的请求仍会打到 MySQL，以 TTL 与业务异常兜底。
- 击穿：未做互斥锁 / 逻辑过期。热点 Key 过期瞬间的并发请求会同时回源，依赖单个 Key 回源查询本身较快（Promise.all 并发查询）与短 TTL 兜底。
- 雪崩：未做过期时间随机抖动，各 Key 使用固定 TTL。但本项目 Key 数量少、单 Key 回源代价可控，且 TTL 绝对值短（300/600 秒），实际风险低，以 TTL 兜底。

综上，本项目采用"Cache Aside（旁路缓存）+ TTL 兜底"的基础缓存策略，其中 `home:data` 额外实现了写库后删除缓存的一致性保障；`product:detail` 与 `travel:routes` 为纯 TTL 兜底（最终一致，最长延迟 10 分钟 / 5 分钟），这是课程阶段刻意保持的简单实现，可作为答辩中"演进方向"的讨论点。

## 四、证据材料清单

以下为答辩时可补充截图的证据点（附建议截图内容，测试数据请在本地环境实际操作后自行采集）：

| 编号 | 证据点 | 建议截图内容 |
|------|--------|--------------|
| E-1 | 连接配置代码 | 打开 `server/src/config/config.default.ts` 第 31-38 行，展示 REDIS_HOST/REDIS_PORT/REDIS_DB 环境变量配置 |
| E-2 | 组件注册代码 | 打开 `server/src/configuration.ts` 第 43 行附近，展示 `imports` 数组中注册的 `redis` 组件 |
| E-3 | Key 清单 | 本地执行 `redis-cli -n 0 keys '*'`，展示运行时 Redis 中实际存在的 `home:data`、`product:detail:*`、`travel:routes:*` 等 Key |
| E-4 | TTL 实时值 | 首次访问首页后立即执行 `redis-cli -n 0 TTL home:data`，展示返回 300 附近的剩余秒数（可隔几秒连打两次，数值递减） |
| E-5 | 验证码写入 | 调用 `POST /api/auth/sms-code` 后执行 `redis-cli -n 0 GET sms:code:13800000000`，展示值为 123456；再执行 `TTL` 展示 300 秒；注册成功后再次 `GET` 展示返回 (nil)（已删除） |
| E-6 | 首页缓存主动失效 | 1) 访问 `GET /api/home/` 使 `home:data` 生成；2) 后台保存或删除一条轮播图（`POST /api/admin/banners/save`）；3) 立即 `redis-cli GET home:data` 展示返回 (nil)，证明主动失效生效 |
| E-7 | 缓存命中前后响应对比 | 连续两次请求 `GET /api/home/` 或 `GET /api/clothing/products/:id`，用浏览器 DevTools Network 面板截图两次请求耗时对比（首次回源较慢、第二次命中缓存较快），具体数值以本地实测为准，不要引用未实测的数据 |
| E-8 | 命令流监控 | 本地执行 `redis-cli -n 0 MONITOR`，再访问一次首页，截图展示 MONITOR 输出中依次出现的 `GET home:data`（未命中）与 `SET home:data ... EX 300`，以及再次访问时只出现 `GET home:data` 而无 SET，证明命中后不再回源 |
| E-9 | 商品详情缓存代码 | 打开 `server/src/module/clothing/clothing.service.ts` 第 105-135 行，展示读缓存、Promise.all 并发查库、写缓存 600 秒的完整实现 |
| E-10 | 路线列表缓存代码 | 打开 `server/src/module/travel/travel.module.ts` 第 121-146 行，展示筛选参数拼 Key、读缓存、写缓存 300 秒的实现 |
| E-11 | 验证码一次性消费代码 | 打开 `server/src/module/auth/auth.service.ts` 第 37-52 行，展示发送时 EX 300 写入、校验成功后 del 的逻辑 |
| E-12 | 运营缓存清除调用点 | 打开 `server/src/module/admin/admin.module.ts` 第 88-90 行与第 290 行附近，展示 `clearHomeCache()` 定义及其在 saveBanner 等运营接口中的调用 |
