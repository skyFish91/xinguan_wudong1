# 乌东文旅"衣食住行"综合服务平台 · 设计文档（最终整合版）

| 项目 | 内容 |
|---|---|
| 文档版本 | V1.0（整合版） |
| 编制日期 | 2026-09-09 |
| 项目名称 | 乌东文旅"衣食住行"综合服务平台 |
| 业务主线 | 衣食住行 + 社区分享 + 平台管理 |
| 架构形态 | **模块化单体（Modular Monolith）** · 单仓 Monorepo + 目录隔离 |
| 后端框架 | Midway.js v4（Koa 模式）+ TypeScript + TypeORM |
| 前端框架 | Vue 3 + Vite + Element Plus + Pinia（PC/后台）；uni-app（小程序） |
| 数据库 | MySQL 8.0 + Redis 7 |
| 团队规模 | 1 组 6 人协作开发 |

> **整合说明**：本文档由四份材料择优整合而成——《系统设计说明书 V2.1》（主体骨架）、《项目架构设计文档 V1.0》（架构决策 ADR）、`2026-09-08-wudong-详细设计文档 V3.0`（团队协作/时序/代码样例）、《开发文档 V1.0》（字段细节/安全规范）。
> **关键取舍**：① 后端统一为 **Midway.js + TypeORM**（放弃早期 Express + Sequelize 路线）；② 架构统一为 **模块化单体单仓**（放弃 Cool Admin 多仓库 + Verdaccio 方案，该方案外部模块加载为"待验证项"）；③ 金额统一存 **「分」**（放弃 DECIMAL 元）；④ 表命名采用 `前缀_业务名` 体系。

---

# 目录

**第一部分 总体设计** — 1 概述 · 2 架构决策(ADR) · 3 技术选型 · 4 系统架构 · 5 工程结构

**第二部分 公共能力设计** — 6 统一响应/错误码 · 7 用户与鉴权 · 8 统一订单 · 9 统一购物车 · 10 支付与幂等 · 11 上传 · 12 收藏/消息/搜索/敏感词 · 13 并发与库存

**第三部分 数据设计** — 14 命名规范 · 15 表前缀 · 16 公共表清单 · 17 核心表字段

**第四部分 接口设计** — 18 URL 规范 · 19 分页响应 · 20 公共接口清单 · 21 接口文档要求

**第五部分 业务板块** — 22 衣 · 23 食 · 24 住 · 25 行 · 26 社区 · 27 管理后台

**第六部分 前后端实现** — 28 前端架构 · 29 后端架构与关键实现

**第七部分 核心流程** — 30 时序设计

**第八部分 工程实施** — 31 安全 · 32 部署 · 33 测试 · 34 开发规范 · 35 里程碑 · 36 团队分工 · 37 环境搭建 · 38 风险 · 39 路演答辩 · 40 附录

---

# 第一部分 总体设计

## 1. 项目概述与设计目标

### 1.1 业务背景

乌东村是贵州黔东南苗族侗族自治州特色苗寨，拥有苗族银饰锻造、蜡染刺绣、苗家长桌宴、特色民宿、苗寨梯田与节庆文化等文旅资源。现有运营以线下为主，缺乏统一的线上服务入口。

### 1.2 三端范围

| 终端 | 技术方案 | 主要用户 |
|---|---|---|
| 微信小程序端 | uni-app（Vue 3） | 游客 |
| PC 网页端 | Vue 3 + Vite + Element Plus | 游客、商家 |
| 管理后台 | Vue 3 + Vite + Element Plus（独立 SPA） | 商家、平台管理员 |

### 1.3 六大业务板块

| 板块 | 名称 | 核心业务 | 表前缀 | 目录 |
|---|---|---|---|---|
| 板块一 | 衣——非遗商品 | 银饰/蜡染/刺绣/服饰电商 | `prd_` | `m1-product` |
| 板块二 | 食——餐饮美食 | 餐位预订 + 农产品特产 | `food_`/`farm_` | `m2-food` |
| 板块三 | 住——住宿预订 | 民宿/客栈搜索预订 | `sty_` | `m3-stay` |
| 板块四 | 行——线路订票 | 门票 + 路线套餐 + 电子票 | `tvl_` | `m4-travel` |
| 板块五 | 社区——照片分享 | 游记/照片/短视频 UGC | `note_` | `m5-community` |
| 板块六 | 平台管理后台 | 用户/商家/订单/内容/数据/财务 | `sys_`/`fin_` | `m6-admin` |

### 1.4 设计目标

| 目标 | 说明 |
|---|---|
| 一站式 | 内容种草 → 社区分享 → 商品/餐饮/住宿/门票预订 → 订单管理，全链路一个平台完成 |
| 统一体验 | 一套账号、一套订单、一套支付、一套消息，用户感受不到背后多个业务板块 |
| 边界清晰 | 6 个业务板块数据归属明确、互不重叠 |
| 可验收 | 满足需求规格书验收清单（功能、测试、文档、录屏） |

### 1.5 现实约束与应对

| 约束 | 应对 |
|---|---|
| 无微信支付商户号 | 支付抽象为 `Provider`，默认 `MockPayProvider`：点「支付」直接改状态为已支付 |
| 无短信服务商 | 验证码开发态固定 `123456`，同时打印到日志 |
| 无 OSS 账号 | 文件落本地 `public/upload`，`FileService` 接口预留切云存储 |
| 无小程序 AppID | PC 端优先；uni-app 可编译 H5 预览 |
| 工期约 7~8 周 | 明确 MVP 范围，非核心功能标注「可选」 |

### 1.6 本期不做

真实支付/退款/分账、真实短信、真实内容安全机审（本地敏感词库替代）、推荐算法（人工推荐位 + 热度排序）、多语言、微服务拆分。

---

## 2. 架构决策记录（ADR）

> 摘编自《项目架构设计文档 V1.0》，经小组讨论确认。

| 编号 | 决策 | 选择 | 理由 |
|---|---|---|---|
| ADR-1 | 架构形态 | 模块化单体 | 课程周期内单体可交付、可演示、可测试，模块边界清晰保留拆分可能 |
| ADR-2 | 后端框架 | Midway（Node.js + TS） | 课程技术主线指定，中文文档、IoC 装饰器 |
| ADR-3 | ORM | TypeORM | Midway 官方配套，参数化查询防 SQL 注入 |
| ADR-4 | 前端 | Vue 3 + Vite + Element Plus + Pinia | 课程主线指定 Vue，生态成熟 |
| ADR-5 | 认证 | JWT 双 token（access 2h + refresh 7d）+ bcrypt | 前后端分离标准方案 |
| ADR-6 | 支付 | 模拟微信支付 | 无商户资质，Provider 抽象 + mock 默认 |
| ADR-7 | 文件存储 | 本地磁盘 + 静态服务 | 需求明确"上传到本地磁盘"，预留切 OSS |
| ADR-8 | 缓存 | Redis（Docker 容器） | 验证码、幂等键、热点缓存 |
| ADR-9 | 部署 | Docker Compose 单机编排 | 课程主线，一条命令起依赖 |
| ADR-10 | 终端范围 | PC Web + 管理后台（小程序可选） | 无 AppID，PC 优先，uni-app 可编译 H5 |

---

## 3. 技术选型

| 层次 | 选型 | 版本 | 理由 |
|---|---|---|---|
| 后端框架 | Midway.js（Koa 模式） | v4.0.0 | 中文文档、IoC 装饰器、内置 Swagger/校验/上传组件，直接产出 OpenAPI |
| 运行时 | Node.js | ≥ 20 LTS（推荐 22） | Midway v4 硬性要求 |
| 语言 | TypeScript | 5.x | 类型即契约 |
| ORM | TypeORM | 1.x（`@midwayjs/typeorm@4`） | 官方组件，Entity 与表结构一一对应 |
| 数据库 | MySQL | 8.0 | utf8mb4 |
| 缓存 | Redis | 7.x | 验证码、幂等键、热点缓存 |
| PC 前端 / 后台 | Vue 3 + Vite + Element Plus | 3.x | 生态成熟 |
| 小程序 / 移动端 | uni-app（Vue 3） | 3.x | 与 PC 同为 Vue 语法，一套框架打天下 |
| 状态管理 | Pinia | — | 全部前端工程 |
| 图表 | ECharts | 5.x | 数据看板、商家统计 |
| 接口文档 | `@midwayjs/swagger@4` | — | 装饰器自动生成，满足验收项 |
| 测试 | Jest + SuperTest（后端）/ Vitest（前端） | — | 单元 + 接口 |
| 代码规范 | ESLint + Prettier + EditorConfig | — | 统一风格 |
| 部署 | Docker Compose + pm2 | — | 一条命令起依赖 |

---

## 4. 系统架构

### 4.1 部署架构

```
                          浏览器 / 微信
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        PC 网页端          小程序端          管理后台
      (Vue3+Vite)        (uni-app)       (Vue3+Element)
              │                │                │
              └────────────────┼────────────────┘
                               │  HTTPS  /api/v1/...
                    ┌──────────▼──────────┐
                    │   Nginx（反向代理）   │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │          Midway.js v4 后端（单进程 pm2）       │
        │   ┌──────────────────────────────────────┐  │
        │   │  公共层：用户 / 订单 / 上传 / 响应     │  │
        │   └──────────────────────────────────────┘  │
        │   ┌────┬────┬────┬────┬──────┬──────────┐   │
        │   │ 衣 │ 食 │ 住 │ 行 │ 社区 │ 管理后台 │   │
        │   └────┴────┴────┴────┴──────┴──────────┘   │
        └──────────────────────┬───────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
           MySQL 8          Redis 7       本地文件存储
        (持久化主库)      (缓存/验证码)    (public/upload)
```

**本期单体部署**，6 个业务板块在同一进程内靠目录 + 命名空间隔离，不拆微服务。拆微服务会引入服务注册、分布式事务、链路追踪，工期内必翻车。

### 4.2 后端分层

| 层 | 职责 | 禁止 |
|---|---|---|
| Controller | 路由分发、参数接收、调 Service、返回结果 | 写业务逻辑、直接操作数据库 |
| Service | 业务逻辑、事务控制 | 直接读写 HTTP 请求对象 |
| Entity | 数据库表映射 | 写业务逻辑 |
| DTO | 入参校验 + Swagger 文档 | 当 Entity 用 |
| Middleware | 跨域、鉴权、日志、请求 ID | 写业务逻辑 |
| Filter | 全局异常捕获、统一响应包装 | 吞掉异常不记录 |

---

## 5. 工程结构

**决策：单仓（Monorepo）+ 目录隔离。** 统一用户/订单/支付决定了各业务板块不可能真正独立；拆多仓的集成成本远高于单仓的 Git 冲突成本。

```
wudong-platform/
├── bootstrap.js                    # 启动入口
├── docker-compose.yml
├── src/
│   ├── configuration.ts            # 组件装配
│   ├── common/                     # 公共常量与封装
│   │   ├── constants/error-code.ts
│   │   ├── constants/biz-type.ts
│   │   ├── result.ts               # 统一响应
│   │   ├── biz-error.ts
│   │   ├── base-entity.ts
│   │   └── page.ts
│   ├── config/                     # 多环境配置
│   ├── entity/                     # 公共实体
│   ├── middleware/                 # 跨域 / 鉴权 / 日志
│   ├── filter/                     # 全局异常
│   ├── decorator/                  # @CurrentUser / @Public
│   ├── util/                       # 订单号、加密
│   └── modules/
│       ├── user/  file/  order/    # 公共服务
│       ├── m1-product/             # 板块一：衣
│       ├── m2-food/                # 板块二：食
│       ├── m3-stay/                # 板块三：住
│       ├── m4-travel/              # 板块四：行
│       ├── m5-community/           # 板块五：社区
│       └── m6-admin/               # 板块六：管理后台
├── web-pc/                         # PC 网页端
├── web-admin/                      # 管理后台
├── app/                            # uni-app 小程序
├── public/upload/
└── docs/
    ├── 乌东文旅平台-设计文档（最终整合版）.md（本册）
    ├── database/01-公共库DDL.sql
    └── api/公共服务接口契约.yaml
```

**目录归属规则**：

| 路径 | 归属 |
|---|---|
| `src/common`、`src/entity`、`src/config`、`src/middleware`、`src/filter`、`src/decorator`、`src/util` | 公共层（变更需评审） |
| `src/modules/{user,file,order}` | 公共层 |
| `src/modules/m1-product` ~ `m6-admin` | 对应业务板块 |

> 管理后台的**前端框架**（布局/路由/菜单/守卫）由板块六提供；各板块的管理页面作为子路由挂进去，但**后端接口仍写在自己模块目录**，用 `@Controller('/api/v1/admin/xxx')` 声明路由即可。

**前端工程命名约定**（摘自《开发文档》）：

- 页面文件：`pages/<module>/<page>.vue`；组件大驼峰 `ProductCard.vue`；API 函数小驼峰 `getProductDetail`；Store 用 `defineStore`。

---

# 第二部分 公共能力设计

> 这一部分是全平台的地基，契约一旦冻结不得单方面修改。

## 6. 统一响应与错误码

### 6.1 统一响应

```json
{ "code": 0, "message": "ok", "data": {}, "traceId": "a1b2c3" }
```

Controller 直接 `return` 业务数据，由全局中间件自动包装。**不要手写 `{code,message,data}`**。

```typescript
Result.ok(data)                       // 成功
Result.page(list, total, page, size)  // 分页
throw new BizError(30002, '库存不足')  // 业务异常
```

### 6.2 错误码号段

| 号段 | 归属 |
|---|---|
| `0` | 成功 |
| `10000–19999` | 公共 / 系统 |
| `20000–29999` | 用户中心 |
| `30000–39999` | 板块一 · 衣 |
| `40000–49999` | 板块二 · 食 |
| `50000–59999` | 板块三 · 住 |
| `60000–69999` | 板块四 · 行 |
| `70000–79999` | 板块五 · 社区 |
| `80000–89999` | 板块六 · 管理后台 |
| `90000–99999` | 订单 / 支付 / 库存 |

HTTP 状态码与业务码分离：HTTP 一律 200（401/403/404/422/500 由框架层抛出），业务成败看 `code`。

### 6.3 全局异常

| Filter | 捕获 | 返回 |
|---|---|---|
| `ValidateFilter` | `MidwayValidationError` | 422，`{code:10001, message:"参数错误：xxx"}` |
| `DefaultFilter` | 其余异常 | 500，`{code:10005, message:"系统繁忙，请稍后再试"}` + error 日志 |
| `NotFoundFilter` | 路由未匹配 | 404，`{code:10004}` |

---

## 7. 用户与鉴权

### 7.1 登录方式

| 端 | 方式 |
|---|---|
| 小程序 | `wx.login` → code → 后端换 openid → 绑定/创建用户 → 签发 JWT |
| PC / 后台 | 手机号 + 密码（bcrypt）/ 手机号 + 验证码 |

### 7.2 JWT 约定

| 项 | 值 |
|---|---|
| 载荷 | `{ userId, role: 'USER' \| 'MERCHANT' \| 'ADMIN', merchantId }` |
| 有效期 | 用户端 7 天；管理端 2 小时（Refresh 无感续期） |
| 传参 | `Authorization: Bearer <token>` |
| 免鉴权 | 方法上加 `@Public()` |
| 取当前用户 | `@CurrentUser() user: JwtPayload` |

### 7.3 角色与数据隔离

| 角色 | 后台可见范围 |
|---|---|
| `USER` | 无后台权限 |
| `MERCHANT` | 只能看自己 `merchantId` 下的数据 |
| `ADMIN` | 全部 |

商家数据隔离由 `MerchantScopeService` 统一注入过滤条件，管理端查询**必须**过它，防越权。

### 7.4 个人中心聚合

| 功能 | 数据来源 |
|---|---|
| 我的订单 | 统一订单中心，按 `bizType` 切 Tab |
| 我的收藏 | 统一收藏表，按 `targetType` 聚合 |
| 我的相册 | 社区板块游记 |
| 我的评价 | 各板块评价表聚合 |
| 收货地址 | 公共 `usr_user_address` |

---

## 8. 统一订单

### 8.1 三段式设计

需求要求「统一订单中心」，但各板块又有自己的业务字段。采用**主表 + 公共明细 + 板块扩展表**：

```
ord_order                 主表（公共层独占，其他板块只读）
  ├─ ord_order_item       商品明细行（公共）
  ├─ ord_ext_goods        实物扩展（收货地址 / 物流）   ← 衣、食（特产）写
  ├─ ord_ext_seat         餐位扩展（日期 / 时段 / 人数）← 食写
  ├─ ord_ext_stay         住宿扩展（入住 / 离店 / 房型）← 住写
  └─ ord_ext_ticket       门票扩展（使用日期 / 电子票）← 行写
```

**主表关键字段**：`order_no`、`biz_type`、`user_id`、`merchant_id`、`total_amount`/`pay_amount`（分）、`status`、`pay_status`、`expire_time`、`client_request_id`。

### 8.2 订单类型

| bizType | 来源板块 | 扩展表 |
|---|---|---|
| `GOODS` | 衣、食（农产品特产） | `ord_ext_goods` |
| `SEAT` | 食（餐位预订） | `ord_ext_seat` |
| `STAY` | 住 | `ord_ext_stay` |
| `TICKET` | 行（门票） | `ord_ext_ticket` |
| `ROUTE` | 行（路线套餐） | `ord_ext_ticket` |

### 8.3 状态机

```
PENDING（待支付）
   ├── 支付成功 ──> PAID（待确认）
   │                  ├── 商家确认 ──> CONFIRMED
   │                  │                   ├── 到店/发货 ──> ONGOING
   │                  │                   │                   └──> FINISHED ──> REVIEWED
   │                  └── 商家拒绝 ──> REFUNDED
   ├── 用户取消 ──> CANCELLED
   └── 超时未付 ──> CLOSED
```

**状态变更只能走 `OrderService.changeStatus()`**，它会校验流转合法性、写 `ord_order_log`、发消息通知。各板块响应状态变化用事件订阅：

```typescript
@OnEvent('order.paid')
async onPaid(p: { orderNo: string; bizType: string }) {
  if (p.bizType !== 'STAY') return;
  // 扣房态逻辑
}
```

### 8.4 退款

`ord_refund` 统一记录，`penalty_rate` 由各板块按自身取消政策计算后传入（详见各板块章节）。

---

## 9. 统一购物车

- **只有「衣」的商品和「食」的农产品特产进购物车**；民宿 / 餐位 / 门票 / 线路**直接下单**。
- 表：`ord_cart`（每用户一行）+ `ord_cart_item`，用 `item_type` 区分 `PRODUCT` / `FARM`。
- 加购时由**各板块自己的 Service** 校验库存与规格合法性，公共层只负责存取。
- 结算调 `OrderService.createFromCart()`，自动按 `merchant_id` 拆单。

---

## 10. 统一支付与幂等

```typescript
interface PayProvider {
  createPayment(orderNo, amountFen): Promise<PayResult>;
  queryPayment(orderNo): Promise<PayStatus>;
  refund(orderNo, amountFen): Promise<RefundResult>;
}
```

| 实现 | 状态 | 行为 |
|---|---|---|
| `MockPayProvider` | **本期默认** | 点「支付」直接改订单为已支付，无外部依赖 |
| `WechatPayProvider` | 预留空实现 | 需商户号时再填，接口不变 |

**幂等（必须遵守）**：下单接口接收 `clientRequestId`（前端 UUID），后端 Redis `SETNX` 幂等，重复提交返回**原订单**而非新建。

---

## 11. 统一上传

```
POST /api/v1/file/upload         图片（jpg/png/webp，≤ 5MB）
POST /api/v1/file/upload-video   视频（mp4，≤ 100MB，≤ 60s）
```

返回 `{ fileId, url, width, height, duration }`。

**安全配置（不许删）**：

| 配置 | 原因 |
|---|---|
| `upload.match: /\/api\/v1\/file\//` | 否则任何 POST 请求都会被当成上传解析，写满临时目录 |
| `mimeTypeWhiteList` | 防伪造扩展名上传 WebShell |
| 单用户每日上传配额 | 防磁盘被打满 |

---

## 12. 收藏 / 消息 / 搜索 / 敏感词

| 能力 | 说明 |
|---|---|
| 收藏 | `POST /api/v1/favorite/toggle`，`targetType` ∈ `PRODUCT / FARM / RESTAURANT / STAY / SCENIC / ROUTE / NOTE`，多态关联不建外键 |
| 消息 | `MessageService.send()`，类型 `SYSTEM / ORDER / INTERACT`；禁止直接 INSERT `sys_message` |
| 搜索 | 各板块关键词搜索 + 搜索历史（用户级）+ 热搜词（后台可配） |
| 敏感词 | `SensitiveService.check(text)`，命中进待审核；用户累计违规 3 次自动禁言 24 小时 |

---

## 13. 并发与库存

统一用**条件更新**，禁止「先查再改」：

```sql
UPDATE xxx SET stock = stock - :n, version = version + 1
WHERE id = :id AND stock >= :n;
-- affectedRows = 0 → 抛「库存不足」
```

房态、餐位、门票同理，用 `affectedRows` 判断成败。Redis 只用于缓存与幂等，**不作为库存最终依据**。

---

# 第三部分 数据设计

## 14. 数据库命名规范

| 对象 | 规范 |
|---|---|
| 表名 | `前缀_业务名`，全小写下划线 |
| 字段 | 蛇形命名 |
| 主键 | `id` BIGINT UNSIGNED AUTO_INCREMENT |
| **金额** | **统一存「分」，INT UNSIGNED**，禁止 DECIMAL / FLOAT / DOUBLE |
| 时间 | DATETIME，默认 CURRENT_TIMESTAMP |
| 软删除 | `deleted_at DATETIME NULL` |
| 状态 | TINYINT + 常量类，不用 varchar |
| 字符集 | utf8mb4 / utf8mb4_0900_ai_ci |
| 外键 | **跨板块一律不建物理外键** |

> 存储引擎 InnoDB；每表必含 `id`、`created_at`、`updated_at`，可删除数据加 `deleted_at`。

## 15. 表前缀与归属

| 前缀 | 归属板块 |
|---|---|
| `usr_` `mch_` `ord_` `sys_` `cms_` | 公共层 |
| `prd_` | 板块一 · 衣 |
| `food_` `farm_` | 板块二 · 食 |
| `sty_` | 板块三 · 住 |
| `tvl_` | 板块四 · 行 |
| `note_` | 板块五 · 社区 |
| `fin_` | 板块六 · 管理后台 |

## 16. 公共表清单

全库共 **7 个 DDL 文件、71 张表**，统一数据库名 **`wudong`**（utf8mb4）：

| 文件 | 归属 | 表数 |
|---|---|---|
| `01-公共库DDL.sql` | 公共层 | 31 |
| `02-板块一-衣.sql` | 衣 `prd_*` | 8 |
| `03-板块二-食.sql` | 食 `food_*`/`farm_*` | 8 |
| `04-板块三-住.sql` | 住 `sty_*` | 6 |
| `05-板块四-行.sql` | 行 `tvl_*` | 8 |
| `06-板块五-社区.sql` | 社区 `note_*` | 8 |
| `07-板块六-管理后台.sql` | 管理 `fin_*` | 2 |

| 分类 | 表 |
|---|---|
| 用户 | `usr_user`、`usr_oauth`、`usr_user_address` |
| 商家 | `mch_merchant`、`mch_merchant_apply` |
| 订单 | `ord_order`、`ord_order_item`、`ord_cart`、`ord_cart_item`、`ord_refund`、`ord_order_log` |
| 订单扩展 | `ord_ext_goods`、`ord_ext_seat`、`ord_ext_stay`、`ord_ext_ticket` |
| 权限 | `sys_admin`、`sys_role`、`sys_permission`、`sys_admin_role`、`sys_role_permission` |
| 系统 | `sys_config`、`sys_dict`、`sys_file`、`sys_message`、`sys_sensitive_word`、`sys_operation_log` |
| 通用 | `sys_favorite`、`sys_search_history` |
| 运营 | `cms_banner`、`cms_notice`、`cms_recommend` |

## 17. 核心表字段设计

> 字段级定义（金额单位已统一为「分」）。以下列出公共层最核心的表，其余板块表详见各板块章节。

### 17.1 用户表 `usr_user`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT U | 主键 |
| phone | VARCHAR(20) | 手机号，唯一索引 |
| password_hash | VARCHAR(100) | bcrypt 哈希 |
| wx_openid | VARCHAR(64) | 微信 openid，唯一索引 |
| nickname / avatar_url | VARCHAR | 昵称 / 头像 URL |
| status | TINYINT | 0 正常 1 禁用 |
| mute_until | DATETIME | 禁言截止（敏感词违规累计） |
| last_login_at | DATETIME | 最近登录 |

### 17.2 统一订单主表 `ord_order`

| 字段 | 类型 | 说明 |
|---|---|---|
| order_no | VARCHAR(32) | 订单号，唯一索引 |
| user_id / merchant_id | BIGINT U | 用户 / 商家 |
| biz_type | VARCHAR(16) | GOODS/SEAT/STAY/TICKET/ROUTE |
| total_amount / pay_amount | INT U | **分** |
| status / pay_status | TINYINT | 状态机 |
| expire_time | DATETIME | 支付超时 |
| client_request_id | VARCHAR(64) | 幂等键 |

### 17.3 订单明细 `ord_order_item`

| 字段 | 说明 |
|---|---|
| order_id | 主表 |
| product_id / sku_id | 商品 / SKU |
| name / sku_name / price / quantity / image_url | 下单快照（防商品改价） |

### 17.4 收藏 `sys_favorite`

| 字段 | 说明 |
|---|---|
| user_id + target_type + target_id | **联合唯一索引**，防重复收藏 |

---

# 第四部分 接口设计

## 18. URL 与请求规范

```
/api/v1/{板块}/{资源}/{动作}
```

| 前缀 | 板块 |
|---|---|
| `/user` `/file` `/order` `/cart` `/favorite` `/message` `/common` | 公共 |
| `/product` | 衣 |
| `/food` `/farm` | 食 |
| `/stay` | 住 |
| `/travel` `/ticket` | 行 |
| `/note` `/topic` | 社区 |
| `/admin/*` | 管理端（代码仍写在各板块目录） |

| 方法 | 用途 |
|---|---|
| GET | 查询 |
| POST | 新增 / 提交（下单、发布、登录） |
| PUT | 全量更新 |
| PATCH | 部分更新（上下架、改状态） |
| DELETE | 删除 |

**必带请求头**：`Authorization`、`Content-Type: application/json`、`x-client: PC | MINI | ADMIN`

## 19. 分页与响应

入参 `page`（从 1）、`pageSize`（默认 10，最大 100）。

```json
{
  "code": 0, "message": "ok",
  "data": { "list": [], "total": 128, "page": 1, "pageSize": 10, "totalPage": 13 }
}
```

## 20. 公共服务接口清单

完整定义见 `docs/api/公共服务接口契约.yaml`（OpenAPI 3.0.3，24 个接口）。

| 分组 | 接口 |
|---|---|
| 用户 | `send-code`、`register`、`login`、`login-code`、`wx-login`、`profile`、`address/*` |
| 文件 | `upload`、`upload-video` |
| 订单 | `create`、`pay`、`cancel`、`refund`、`list`、`detail` |
| 购物车 | `list`、`add`、`update`、`remove` |
| 收藏 | `toggle`、`list` |
| 消息 | `list`、`read` |

## 21. 接口文档要求

每个 Controller 方法**必须**带 `@ApiTags` + `@ApiOperation` + `@ApiResponse`；每个 DTO 字段**必须**带 `@ApiProperty` + `@Rule`。缺一样 Swagger 就出不来，验收过不了。

---

# 第五部分 业务板块详细设计

## 22. 板块一：衣 —— 非遗商品

> 需求规格书第 6 章 · 后端目录 `src/modules/m1-product` · 表前缀 `prd_`

### 22.1 板块概述

展示和销售苗族银饰、蜡染、刺绣、苗族服饰等非遗手工艺品。

**与其他板块的本质区别**：商品具有强文化属性，详情页不只是「规格 + 价格」，还要承载**工艺介绍、文化故事、传承人信息**。这是本板块的设计重心，别做成普通电商列表。

**在平台中的位置**：唯一进购物车的两类实体之一（另一类是食的农产品特产）；下单走 `GOODS` 订单；商品可被社区游记关联。

### 22.2 功能清单

| 编号 | 功能 | 端 | 优先级 |
|---|---|---|---|
| 1.1 | 分类浏览（一级 + 二级） | 双端 | **P0** |
| 1.2 | 商品列表（分类/价格/销量/评分筛选，分页，下拉刷新） | 双端 | **P0** |
| 1.3 | 商品搜索（关键词 + 历史 + 热门） | 双端 | P1 |
| 1.4 | 商品详情（主图 + 工艺 + 传承人 + 规格 + 评价 + 富文本） | 双端 | **P0** |
| 1.5 | 加入购物车 / 立即购买 | 双端 | **P0** |
| 1.6 | 收藏 | 双端 | P1 |
| 1.7 | 评价（文字 + 图片 + 评分）+ 追评 | 双端 | P1 |
| 1.8 | PC 多条件组合筛选（分类/价格/评分/风格/材质） | PC | P1 |
| 1.9 | PC 购物车（增删改、失效提示、合计、去结算） | PC | **P0** |
| 1.10 | PC 收藏夹 / 评价中心 | PC | P2 |
| 1.11 | 后台：分类管理 | 后台 | **P0** |
| 1.12 | 后台：商品管理（新增/编辑/上下架/批量导入） | 后台 | **P0** |
| 1.13 | 后台：库存管理 + 预警（<10） | 后台 | **P0** |
| 1.14 | 后台：订单管理（发货 / 改物流 / 退款审核） | 后台 | **P0** |
| 1.15 | 后台：评价管理 | 后台 | P1 |
| 1.16 | 后台：数据统计（销售额/订单量/热销 TOP10/评价数） | 后台 | P1 |

### 22.3 数据实体

| 表名 | 用途 |
|---|---|
| `prd_category` | 商品分类（两级自关联） |
| `prd_craftsman` | 非遗传承人 |
| `prd_goods` | 商品主表 |
| `prd_sku` | 商品规格 |
| `prd_goods_image` | 商品图片 |
| `prd_review` / `prd_review_image` | 商品评价 |
| `prd_freight_template` | 运费模板 |

**prd_goods 关键字段**：

| 字段 | 说明 |
|---|---|
| `min_price` / `max_price` | 价格区间（分），**由 SKU 冗余**，列表页不用 join |
| `total_stock` | 总库存（SKU 之和，冗余） |
| `rating` / `review_count` | 评分与评价数（冗余） |
| `craft_intro` / `culture_story` | **工艺介绍 / 文化故事**（富文本） |
| `craftsman_id` | 关联传承人 |
| `material` / `style` | 材质 / 风格，用于 PC 筛选 |
| `freight_template_id` | 运费模板 |
| `status` | 1 上架 2 下架 3 售罄 |

索引：`idx_category`、`idx_status_sales(status, sales)`、`idx_price(min_price)`、全文索引 `ft_title`

**prd_sku**：`sku_code`(唯一)、`spec_name`、`price`、`stock`、`warn_stock`(默认10)、`version`(乐观锁)

**prd_review**：含 `append_content` / `append_time`（追评）、`merchant_reply`、`uk_order_sku` 防重复评价

> **冗余字段必须同步**：SKU 价格/库存变更、新增评价后，要回写 `prd_goods`。建议封装 `GoodsSyncService.refresh(goodsId)` 统一调用。

### 22.4 接口

**前台**：`category/tree`、`list`、`search`、`detail`、`sku/{goodsId}`、`review/list`、`review/create`、`review/append`

**管理端**（`/api/v1/admin/product/*`）：`category/*`、`list`、`create`/`update`、`status`、`stock`、`stock/warn`、`review/*`、`order/list`、`order/ship`、`order/logistics`、`stat/overview`

### 22.5 页面

| 页面 | 端 | 要素 |
|---|---|---|
| 商品分类 | 双端 | 左侧分类树 + 右侧商品流 |
| 商品列表 | 双端 | 筛选栏、排序 Tab、卡片流 |
| **商品详情** | 双端 | 主图轮播 / 价格区间 / **工艺介绍** / **传承人卡片** / 规格选择器 / 评价 / 详情富文本 |
| 购物车 | PC | 按商家分组、勾选、失效提示、合计 |
| 确认订单 | 双端 | 地址、清单、运费、提交 |
| 评价 | 双端 | 星级、文字、图片（≤9）、匿名 |

**详情页信息层级**（转化率关键，按序排）：主图轮播 → 价格与销量评分 → 标题 → 工艺介绍 → 传承人卡片 → 规格选择器 → 服务承诺 → 评价 → 详情富文本 → 底部操作栏

### 22.6 业务规则

| 规则 | 实现 |
|---|---|
| 库存为 0 不可下单 | 详情返回库存；**下单前 Service 再校验一次**（前端校验不算数） |
| 7 天无理由退换（定制品除外） | 商品加 `support_return` 字段，退款时校验 |
| 评价后 30 天内可追评一次 | `append_time IS NULL AND create_time > NOW() - 30d` |
| 只有已购用户可评价 | 校验订单存在且为 FINISHED |
| 库存预警 < 10 | 定时任务 + 预警列表接口 |

**订单状态对应动作**：`ONGOING` 发货（写物流单号）→ `FINISHED` 确认收货（写 `receive_time`，开放评价）→ `REFUNDED` 校验 `support_return`

### 22.7 与公共层对接

购物车 `itemType=PRODUCT`；下单 `bizType=GOODS`；写 `ord_ext_goods`；收藏 `targetType=PRODUCT`；错误码 `30000–39999`。

**禁止**：跨板块 import、自己 INSERT `ord_order`、自己写支付、直接改 `ord_order.status`。

### 22.8 验收要点

- [ ] 防超卖已通过并发测试
- [ ] 冗余字段（价格/库存/评分）同步正确
- [ ] 富文本 XSS 已过滤
- [ ] 加购 → 下单 → 支付 → 我的订单全链路打通

---

## 23. 板块二：食 —— 餐饮美食

> 需求规格书第 7 章 · 后端目录 `src/modules/m2-food` · 表前缀 `food_` `farm_`

### 23.1 板块概述

本板块是**两个子业务的合体**，必须一开始就认清，否则会做成四不像：

| 子业务 | 本质 | 走的链路 |
|---|---|---|
| **餐饮预订** | 服务类，**不进购物车**，订时段 | 直接下单 → `SEAT` → `ord_ext_seat` |
| **农产品特产** | 实物电商，**进购物车** | 加购 → `GOODS` → `ord_ext_goods` |

两条链路共用商家体系，但**订单类型、扩展表、取消规则完全不同**，代码里要分开（建议目录再分 `restaurant/` 和 `farm/`）。

### 23.2 功能清单

| 编号 | 功能 | 子业务 | 优先级 |
|---|---|---|---|
| 2.1 | 餐厅列表（距离/评分/价格排序，地图模式） | 餐饮 | **P0** |
| 2.2 | 餐厅详情（介绍/菜品/营业时间/位置/评价） | 餐饮 | **P0** |
| 2.3 | 餐位预订（日期 → 时段 → 人数 → 联系人） | 餐饮 | **P0** |
| 2.4 | 我的餐位预订（查看 / 取消） | 餐饮 | **P0** |
| 2.5 | 餐厅收藏 / 评价 | 餐饮 | P1 |
| 2.6 | PC 美食地图 | 餐饮 | P1 |
| 2.7 | 农产品分类（茶叶/腊肉/米酒/酸食/其他） | 特产 | **P0** |
| 2.8 | 农产品列表 + 详情（产地溯源、保质期） | 特产 | **P0** |
| 2.9 | 农产品加购 / 立即购买 | 特产 | **P0** |
| 2.10 | 后台：餐厅管理（信息/营业时间/座位数/菜品） | 餐饮 | **P0** |
| 2.11 | 后台：时段管理（配置 + 最大预订数） | 餐饮 | **P0** |
| 2.12 | 后台：预订管理（确认 / 拒绝填原因） | 餐饮 | **P0** |
| 2.13 | 后台：农产品分类 + 商品 + 库存 | 特产 | **P0** |
| 2.14 | 后台：订单管理（餐位 + 农产品统一） | 两者 | **P0** |
| 2.15 | 后台：数据统计（预订量/销售额/TOP 菜品） | 两者 | P1 |

### 23.3 数据实体

| 表名 | 用途 |
|---|---|
| `food_restaurant` | 餐厅（含 `lng`/`lat` 坐标） |
| `food_dish` | 菜品（含 `is_signature` 招牌标记） |
| `food_slot` | 餐位时段模板，如「午餐 11:30-13:30」 |
| `food_slot_quota` | **某日某时段余量**（本板块核心表） |
| `food_review` | 餐厅评价 |
| `farm_category` / `farm_goods` / `farm_review` | 农产品三件套 |

**food_slot_quota**（餐位库存是「日期 × 时段」二维的，不能只靠时段模板）：

| 字段 | 说明 |
|---|---|
| `restaurant_id` / `slot_id` / `book_date` | 唯一索引 `uk_rest_slot_date` |
| `total_seats` / `used_seats` | 总容量 / 已占用 |
| `version` | 乐观锁 |
| `status` | 1 可订 2 已满 3 停售 |

**初始化**：后台批量生成未来 30 天；或查询时按 `max_seats` 懒创建（注意并发，用 `INSERT ... ON DUPLICATE KEY UPDATE`）。

**farm_goods**：含 `origin`（产地）+ `origin_detail`（溯源富文本）、`shelf_life`（保质期）、`storage`、`freight_template_id`（**独立于衣板块**）、`stock` + `version`

### 23.4 接口

**餐饮前台**：`restaurant/list`、`restaurant/map`、`restaurant/detail`、`restaurant/slots`、`booking/create`、`booking/list`、`booking/cancel`、`review/create`

```
GET /api/v1/food/restaurant/slots?restaurantId=1&date=2026-09-10
→ [{ slotId: 3, slotName: "午餐 11:30-13:30", remain: 12, bookable: true }, ...]
```

**农产品前台**：`farm/category/list`、`farm/goods/list`、`farm/goods/detail`、`farm/review/*`

**管理端**（`/api/v1/admin/food/*`）：`restaurant/*`、`dish/*`、`slot/*`、`slot/quota`（批量生成）、`booking/list`、`booking/confirm`、`booking/reject`、`farm/category/*`、`farm/goods/*`、`order/list`、`stat/overview`

### 23.5 页面

| 页面 | 要素 |
|---|---|
| 餐厅列表 | 卡片（主图/评分/人均/距离/特色标签）、排序 Tab、地图切换 |
| 美食地图（PC） | 地图打点 + 摘要卡 + 跳转详情 |
| 餐厅详情 | 环境图、招牌菜品、营业时间、位置地图、「预订餐位」按钮、评价 |
| **餐位预订** | 日期（近 14 天）→ 时段（显示余量，0 置灰）→ 人数（上限 `min(remain,20)`）→ 联系人 → 提交 |
| 我的餐位预订 | 状态、取消按钮、商家拒绝原因 |
| 农产品详情 | 主图、规格、价格、**产地溯源卡片**、保质期、加购 |

**取消展示**（避免纠纷）：距用餐 >24h 显示「免费取消」；<24h 显示「取消将扣 50%，实退 ¥xx」并二次确认。

### 23.6 业务规则

| 规则 | 实现 |
|---|---|
| **需提前至少 2 小时** | `book_date + slot.start_time - now >= 2h`，否则报 `40003` |
| 余量不足不可订 | 条件更新 `food_slot_quota` |
| **取消政策** | ≥24h 免费；<24h 扣 50%；已过用餐时间不退 |
| 农产品运费独立 | 自建运费模板 |
| 原产地溯源必填 | `origin` + `origin_detail` |

**餐位订单状态**：`PENDING → PAID →（商家确认）CONFIRMED →（到店）FINISHED`；商家拒绝 → `REFUNDED`，原因存 `ord_ext_seat.reject_reason`；商家未确认且已过用餐时间 → 定时任务自动 FINISHED。

### 23.7 与公共层对接

餐位 `bizType=SEAT` + `ord_ext_seat`；农产品 `bizType=GOODS` + `ord_ext_goods`；购物车 `itemType=FARM`；收藏 `RESTAURANT`/`FARM`；退款传 `penaltyRate`；错误码 `40000–49999`。

### 23.8 验收要点

- [ ] 提前 2 小时校验已验证
- [ ] 取消扣费三种情况（>24h / <24h / 已过期）已验证
- [ ] 防超订并发测试通过
- [ ] 农产品与衣板块商品同车结算能正确拆单

---

## 24. 板块三：住 —— 住宿预订

> 需求规格书第 8 章 · 后端目录 `src/modules/m3-stay` · 表前缀 `sty_`

### 24.1 板块概述

展示苗寨特色民宿（木楼、吊脚楼）、客栈，提供**房态日历**搜索与在线预订。

**技术难点**：房态是「房型 × 日期」的二维库存，且要支持 30 天范围查询、动态定价、批量开关房。这是 6 个板块里数据模型最复杂的一个。

### 24.2 功能清单

| 编号 | 功能 | 端 | 优先级 |
|---|---|---|---|
| 3.1 | 民宿搜索（目的地=乌东；入住 + 离店 + 人数） | 双端 | **P0** |
| 3.2 | 民宿列表（列表 + 地图切换；价格/风格/设施/评分筛选） | 双端 | **P0** |
| 3.3 | 民宿详情（主图/房型/设施/地图/评价/入住须知） | 双端 | **P0** |
| 3.4 | **房态日历**（未来 30 天可订情况） | 双端 | **P0** |
| 3.5 | 预订（房型 → 日期 → 入住人 → 支付） | 双端 | **P0** |
| 3.6 | 我的住宿订单（查看/取消/入住码/退款） | 双端 | **P0** |
| 3.7 | 收藏民宿 / 评价民宿 | 双端 | P1 |
| 3.8 | PC 民宿地图 + 多条件筛选 + 房源大图页 | PC | P1 |
| 3.9 | 后台：民宿管理（信息/风格标签/设施标签/上下架） | 后台 | **P0** |
| 3.10 | 后台：房型管理（增删改/定价/库存） | 后台 | **P0** |
| 3.11 | 后台：**房态日历管理**（90 天视图/批量开关/动态定价） | 后台 | **P0** |
| 3.12 | 后台：订单管理（确认/取消/改期/退款审核） | 后台 | **P0** |
| 3.13 | 后台：评价管理 | 后台 | P1 |
| 3.14 | 后台：数据统计（入住率/平均房价/订单量/排行） | 后台 | P1 |

### 24.3 数据实体

| 表名 | 用途 |
|---|---|
| `sty_homestay` | 民宿 |
| `sty_room_type` | 房型 |
| `sty_room_calendar` | **房态日历**（房型 × 日期） |
| `sty_notice` | 入住须知 |
| `sty_review` | 民宿评价 |
| `sty_facility` | 设施字典 |

**sty_homestay**：`merchant_id`、`name`、`address`、`lng`/`lat`、`style_tags`(JSON)、`facility_tags`(JSON)、`main_image`、`images`(JSON)、`intro`、`rating`、`review_count`、`status`

**sty_room_type**：`homestay_id`、`name`（如「苗族木屋大床房」）、`bed_type`、`area`、`max_guests`、`facilities`(JSON)、`base_price`（分）、`total_rooms`（物理房间数）、`images`(JSON)、`status`

**sty_room_calendar**（核心）：

| 字段 | 说明 |
|---|---|
| `room_type_id` / `date` | 唯一索引 `uk_room_date` |
| `total` | 当日可售房量 |
| `sold` | 已售 |
| `price` | **当日价（分）**，支持动态定价，不填则取 `base_price` |
| `status` | 1 可订 2 满房 3 停售 |
| `version` | 乐观锁 |

**sty_notice**：`homestay_id`、`check_in_time`、`check_out_time`、`pet_policy`、`has_breakfast`、`deposit`（分）

### 24.4 房态日历算法（本板块核心）

**范围查询**（搜索可用房）：

```sql
SELECT room_type_id, MIN(price) AS min_price,
       SUM(CASE WHEN total - sold > 0 THEN 1 ELSE 0 END) AS available_days
FROM sty_room_calendar
WHERE room_type_id IN (:ids)
  AND date >= :checkIn AND date < :checkOut   -- 离店日不占房
GROUP BY room_type_id
HAVING available_days = DATEDIFF(:checkOut, :checkIn);
```

> **离店日不占房**是行业惯例，务必用 `<` 而不是 `<=`，否则多算一晚。

**扣减**（下单时）：

```sql
UPDATE sty_room_calendar
SET sold = sold + :n, version = version + 1
WHERE room_type_id = :id AND date BETWEEN :checkIn AND :checkOutLess1
  AND total - sold >= :n;
```

多天必须**同一事务内全部成功**，任一天失败则整体回滚。

**批量设置**：后台提供按日期区间 + 星期规则批量改 `total` / `price` / `status`，用 `INSERT ... ON DUPLICATE KEY UPDATE` 批量 upsert。

**日历接口返回**（给前端渲染）：

```json
{
  "2026-09-10": { "available": 3, "price": 29800, "status": 1 },
  "2026-09-11": { "available": 0, "price": 29800, "status": 2 }
}
```

### 24.5 接口

**前台**：`stay/search`、`stay/list`、`stay/detail`、`stay/calendar`、`stay/room-types`、`booking/create`、`booking/list`、`booking/cancel`、`booking/refund`、`review/create`

**管理端**（`/api/v1/admin/stay/*`）：`homestay/*`、`room-type/*`、`calendar/list`、`calendar/batch-set`、`order/list`、`order/confirm`、`order/cancel`、`order/change-date`、`review/*`、`stat/overview`

### 24.6 页面

| 页面 | 要素 |
|---|---|
| 民宿搜索 | 目的地（默认乌东）+ 入住/离店日期选择器 + 人数 |
| 民宿列表 | 卡片（主图/评分/起价/风格标签）、筛选（价格/风格/设施/评分）、地图切换 |
| 民宿详情 | 主图轮播、房型列表（每个房型显示设施与价格）、设施、位置地图、评价、**入住须知** |
| **房态日历** | 月历视图，可订日期显示价格、满房置灰、点击选入住/离店 |
| 填写订单 | 房型、日期、间数、入住人姓名 + 身份证 + 手机 |
| 我的住宿订单 | 状态、入住码、取消/退款 |

### 24.7 业务规则

| 规则 | 实现 |
|---|---|
| **预订需预付房费** | 下单即支付，无到店付 |
| **取消政策** | 入住前 ≥3 天免费；1–3 天扣 30%；当天及之后不可退 |
| 入住人需提供身份证 | `ord_ext_stay.guest_id_card`，脱敏存储 |
| 评价需在离店后 30 天内 | `check_out + 30d` 内可评 |
| 最少入住 1 晚 | `check_out > check_in` |

**订单状态**：`PENDING → PAID → CONFIRMED →（入住）ONGOING →（离店）FINISHED → REVIEWED`

### 24.8 与公共层对接

`bizType=STAY` + 写 `ord_ext_stay`（`check_in`/`check_out`/`nights`/`room_cnt`/`guest_*`/`check_in_code`）；收藏 `targetType=STAY`；错误码 `50000–59999`。

订阅 `order.paid` 事件扣房态；订阅 `order.cancelled` / `refunded` 释放房态。

### 24.9 验收要点

- [ ] 跨日期房态查询正确（**离店日不占房**）
- [ ] 多天扣减事务性：任一天满房则整单失败并回滚
- [ ] 取消政策三档扣费正确
- [ ] 房态释放：取消/退款后房量回补
- [ ] 日历渲染性能（30 天 × 多房型不卡）

---

## 25. 板块四：行 —— 线路订票

> 需求规格书第 9 章 · 后端目录 `src/modules/m4-travel` · 表前缀 `tvl_`

### 25.1 板块概述

提供景区门票购买、苗寨一日游/两日游路线套餐购买、**电子票核销**。

**特色**：有「核销」这个其他板块没有的线下环节，需要二维码 + 核销端。

### 25.2 功能清单

| 编号 | 功能 | 端 | 优先级 |
|---|---|---|---|
| 4.1 | 景区列表 + 门票列表 | 双端 | **P0** |
| 4.2 | 景区详情（开放时间/地址/票种/评价） | 双端 | **P0** |
| 4.3 | 门票购买（票种 → 日期 → 数量 → 游客信息 → 支付） | 双端 | **P0** |
| 4.4 | 路线套餐列表（一日/两日/多日 + 主题筛选） | 双端 | **P0** |
| 4.5 | 路线详情（行程安排/包含项目/注意事项） | 双端 | **P0** |
| 4.6 | 路线购买（出发日期 → 人数 → 游客信息 → 支付） | 双端 | **P0** |
| 4.7 | 交通攻略（按出发地展示） | 双端 | P1 |
| 4.8 | **我的票务订单 + 电子票二维码 + 核销状态** | 双端 | **P0** |
| 4.9 | 退票申请 | 双端 | **P0** |
| 4.10 | 收藏（景区/路线/攻略）/ 评价 | 双端 | P2 |
| 4.11 | 后台：景区管理 / 票种管理 | 后台 | **P0** |
| 4.12 | 后台：路线套餐管理（CRUD + 行程编辑） | 后台 | **P0** |
| 4.13 | 后台：**电子票核销**（扫码 + 手动输码） | 后台 | **P0** |
| 4.14 | 后台：订单管理 + 退票审核 | 后台 | **P0** |
| 4.15 | 后台：交通攻略管理 | 后台 | P1 |
| 4.16 | 后台：数据统计（票务/路线销量、TOP10） | 后台 | P1 |

### 25.3 数据实体

| 表名 | 用途 |
|---|---|
| `tvl_scenic` | 景区 |
| `tvl_ticket_type` | 票种（成人/儿童/学生/家庭套票） |
| `tvl_ticket_stock` | **票种按日期库存** |
| `tvl_route` | 路线套餐 |
| `tvl_route_day` | 行程安排（每日景点/用餐/住宿/交通） |
| `tvl_e_ticket` | 电子票 |
| `tvl_traffic_guide` | 交通攻略 |
| `tvl_review` | 评价 |

**tvl_scenic**：`name`、`address`、`lng`/`lat`、`open_time`、`intro`、`main_image`、`images`、`status`

**tvl_ticket_type**：`scenic_id`、`name`、`price`（分）、`market_price`、`valid_rule`（有效期规则）、`need_id_card`、`status`

**tvl_ticket_stock**（门票按使用日期区分库存）：`ticket_type_id` + `date`（唯一索引）、`total`、`sold`、`version`

**tvl_route**：`title`、`days`（1/2/多日）、`price`（分）、`includes`（JSON，包含项目）、`departure`、`destination`、`hotel_standard`、`meal_standard`、`notes`、`main_image`、`detail`、`theme`（亲子/摄影/研学/节庆）、`status`

**tvl_route_day**：`route_id`、`day_no`、`description`、`spots`、`meals`、`accommodation`、`transport`

**tvl_e_ticket**：

| 字段 | 说明 |
|---|---|
| `order_id` / `order_no` | — |
| `target_type` / `target_id` | `TICKET` 票种 / `ROUTE` 路线 |
| `use_date` | 使用/出发日期 |
| `verify_code` | 核销码（唯一索引） |
| `qrcode` | 二维码图片 URL |
| `verify_status` | 0 未使用 1 已使用 2 已退款 |
| `verify_time` / `verify_user` | 核销记录 |

### 25.4 接口

**前台**：`travel/scenic/list`、`travel/scenic/detail`、`travel/ticket/stock`、`ticket/book`、`travel/route/list`、`travel/route/detail`、`route/book`、`travel/guide/list`、`travel/order/list`、`travel/order/ticket`、`travel/order/refund`

**管理端**（`/api/v1/admin/travel/*`）：`scenic/*`、`ticket-type/*`、`ticket-stock/*`、`route/*`、`route-day/*`、`verify`（扫码核销）、`verify/manual`（手动输码）、`order/*`、`guide/*`、`stat/overview`

### 25.5 页面

| 页面 | 要素 |
|---|---|
| 景区列表 / 详情 | 主图、开放时间、地址、票种列表（价格 + 余票）、评价 |
| 门票购买 | 票种 → **使用日期** → 数量 → 游客信息（姓名 + 身份证）→ 支付 |
| 路线列表 | 一日/两日/多日 Tab + 主题筛选（亲子/摄影/研学/节庆） |
| 路线详情 | 主图、**每日行程折叠面板**（景点/用餐/住宿/交通）、包含项目、注意事项 |
| **我的票务订单** | 订单列表、电子票卡片（二维码大图 + 核销码 + 状态） |
| 交通攻略 | 按出发地（贵阳/凯里/广州等）展示交通方式、时长、费用 |

### 25.6 业务规则

| 规则 | 实现 |
|---|---|
| **门票按使用日期区分库存** | `tvl_ticket_stock` 按日期一行，条件更新扣减 |
| **路线套餐最少提前 1 天预订** | 提交时校验 `depart_date - today >= 1` |
| 电子票当日有效 | `use_date` 当天可用；过期自动置失效 |
| **退票政策** | 使用日期前 24h 可退，扣 10% 手续费；24h 内不可退 |
| 核销一次即失效 | `verify_status: 0 → 1`，重复扫码报 `60003 已核销` |
| 路线套餐含住宿/餐饮 | **本期不跨板块打通**，仅作为文字描述展示（需求规格书 9.6 标注「如系统支持」） |

### 25.7 与公共层对接

门票 `bizType=TICKET`、路线 `bizType=ROUTE`，均写 `ord_ext_ticket`（存 `verify_code`、`use_date`、`travelers`）；收藏 `SCENIC`/`ROUTE`；错误码 `60000–69999`。

### 25.8 验收要点

- [ ] 按日期库存扣减并发安全
- [ ] 电子票二维码可生成、可扫码/输码核销
- [ ] 重复核销被拦截
- [ ] 退票手续费 10% 计算正确，24h 内不可退
- [ ] 提前 1 天预订校验生效

---

## 26. 板块五：社区 —— 照片分享

> 需求规格书第 10 章 · 后端目录 `src/modules/m5-community` · 表前缀 `note_`

### 26.1 板块概述

游客上传旅行照片、撰写游记、发布短视频，进行点赞、评论、收藏、关注等社交互动，形成乌东文旅内容社区。

**在平台中的位置**：是内容的「种草入口」，也是唯一一个**强依赖内容安全审核**的板块。

### 26.2 功能清单

| 编号 | 功能 | 端 | 优先级 |
|---|---|---|---|
| 5.1 | 首页信息流（推荐 / 最新排序，瀑布流或视频流） | 双端 | **P0** |
| 5.2 | 发布游记（图 ≤9 或视频 → 文字 → 话题 → 关联地点 → 发布） | 双端 | **P0** |
| 5.3 | 游记详情（大图/视频轮播、话题、关联地点、点赞评论收藏分享） | 双端 | **P0** |
| 5.4 | 评论（一级 + 二级回复，@ 用户） | 双端 | **P0** |
| 5.5 | 话题页（话题详情 + 下游记 + 关注话题） | 双端 | P1 |
| 5.6 | 搜索（游记 / 话题 / 用户） | 双端 | P1 |
| 5.7 | 关注（关注/取关、关注列表、粉丝列表） | 双端 | P1 |
| 5.8 | 个人主页（头像/简介/游记/获赞/关注/粉丝） | 双端 | P1 |
| 5.9 | 消息中心（点赞/评论/关注/系统） | 双端 | P1 |
| 5.10 | 举报（游记 / 评论，填原因） | 双端 | P1 |
| 5.11 | PC 瀑布流 + 话题专题页 + 用户主页 | PC | P1 |
| 5.12 | 后台：内容审核（通过 / 拒绝填原因） | 后台 | **P0** |
| 5.13 | 后台：游记管理（按状态/举报数筛选、下架、删除） | 后台 | **P0** |
| 5.14 | 后台：评论管理（敏感过滤、删除） | 后台 | **P0** |
| 5.15 | 后台：话题管理（增删改、置顶、推荐） | 后台 | P1 |
| 5.16 | 后台：举报处理（删内容/警告用户/驳回） | 后台 | **P0** |
| 5.17 | 后台：热门内容推荐（手动设置首页推荐） | 后台 | P1 |
| 5.18 | 后台：数据统计（日发布量/活跃用户/热门话题 TOP10/举报处理率） | 后台 | P1 |

### 26.3 数据实体

| 表名 | 用途 |
|---|---|
| `note_post` | 游记主表 |
| `note_post_image` | 游记图片 |
| `note_comment` | 评论（支持二级） |
| `note_topic` | 话题 |
| `note_topic_follow` | 话题关注 |
| `note_follow` | 用户关注关系 |
| `note_like` | 点赞（多态：游记 / 评论） |
| `note_report` | 举报 |

**note_post**：

| 字段 | 说明 |
|---|---|
| `user_id` | 作者 |
| `title` / `content` | 标题 / 正文（≤5000 字） |
| `video_url` / `cover` | 视频（≤60s）/ 封面 |
| `poi_type` / `poi_id` | **关联地点**（RESTAURANT/STAY/SCENIC），**不建外键** |
| `topic_ids` | JSON 话题 ID 数组 |
| `like_count` / `comment_count` / `favorite_count` / `view_count` | 计数（冗余） |
| `status` | 1 正常 2 审核中 3 已下架 4 已删除 |
| `audit_status` | 0 待审 1 机审通过 2 人工通过 3 拒绝 |
| `reject_reason` | 审核拒绝原因 |

索引：`idx_status_time(status, create_time)`、`idx_user`、`idx_poi(poi_type, poi_id)`、`idx_hot(like_count, create_time)`

**note_comment**：`post_id`、`user_id`、`content`（≤500）、`parent_id`（一级为 0）、`reply_to_user_id`（@ 谁）、`root_id`（冗余根评论，便于查整棵树）、`like_count`、`status`

**note_like**：`user_id` + `target_type`（POST/COMMENT）+ `target_id`，唯一索引防重复点赞

### 26.4 接口

**前台**：`note/feed`（信息流）、`note/publish`、`note/detail`、`note/delete`、`comment/list`、`comment/create`、`comment/delete`、`like/toggle`、`topic/list`、`topic/detail`、`topic/follow`、`user/follow`、`user/profile`、`search`、`report/create`

**管理端**（`/api/v1/admin/note/*`）：`audit/list`、`audit/pass`、`audit/reject`、`post/list`、`post/off`、`post/delete`、`comment/*`、`topic/*`、`report/list`、`report/handle`、`recommend/*`、`stat/overview`

### 26.5 页面

| 页面 | 要素 |
|---|---|
| **社区首页** | 推荐/最新 Tab、瀑布流双列卡片（封面 + 标题 + 作者 + 点赞数）、发布按钮 |
| 发布游记 | 图片选择（≤9，可拖拽排序）/ 视频上传、正文输入、**话题选择**、**关联地点**、发布 |
| 游记详情 | 大图/视频轮播、正文、话题标签、关联地点卡片、点赞/评论/收藏/分享、评论区（一级 + 二级） |
| 话题页 | 话题头图与简介、关注按钮、下游记列表 |
| 个人主页 | 头像、简介、获赞/关注/粉丝数、游记网格 |
| 消息中心 | 点赞 / 评论 / 关注 / 系统 四个 Tab |

### 26.6 业务规则

| 规则 | 实现 |
|---|---|
| 游记文字 ≤ 5000 字 | DTO `@Rule(RuleType.string().max(5000))` |
| 图片 ≤ 9 张；视频 ≤ 60 秒 | 发布时校验 |
| **发布必须经内容安全审核** | 调 `SensitiveService.check()`；命中 → `status=2 审核中`；未命中 → 直接过 |
| 单用户每日最多 10 篇 | Redis 计数，超限报 `70002` |
| 评论 ≤ 500 字 | DTO 校验 |
| 敏感词命中进人工复审；用户累计 3 次自动禁言 24h | 写 `usr_user.mute_until` |

### 26.7 点赞与计数

```
点赞 → note_like 插一条（唯一索引防重）→ note_post.like_count +1
取消 → 删记录 → like_count -1
```

**计数用异步校准**：高并发下直接 ++ 可能不准，可用 Redis 累加 + 定时任务回写数据库。本期数据量小，**事务内直接更新数据库即可**，但要保证唯一索引生效。

### 26.8 与公共层对接

上传必须调 `FileService`（视频走 `/upload-video`）；收藏 `targetType=NOTE`（复用公共 `sys_favorite`）；消息调 `MessageService.send()`（点赞/评论/关注）；**必须接** `SensitiveService`；错误码 `70000–79999`。

**关联地点**：只存 `poi_type` + `poi_id`，需要展示名称时调公共 `PoiService.getName(type, id)`（查不到返回 null，不报错）。

### 26.9 验收要点

- [ ] 发布流程（图/视频/话题/地点）完整
- [ ] 敏感词命中进审核，审核通过/拒绝流程可用
- [ ] 每日 10 篇上限生效
- [ ] 重复点赞被拦截（唯一索引）
- [ ] 二级评论正确嵌套展示
- [ ] 举报 → 后台处理闭环

---

## 27. 板块六：平台管理后台

> 需求规格书第 11 章 · 后端目录 `src/modules/m6-admin` · 表前缀 `sys_` `mch_` `fin_`

### 27.1 板块概述

负责整个管理后台的**公共框架**和**系统级管理**功能。前 5 个板块的后台管理页面将嵌入此框架。

**双重职责**：
1. 提供后台**前端框架**（布局/路由/菜单/鉴权守卫）——其他板块往里挂页面
2. 提供**系统级管理功能**（用户、商家、数据、运营、财务、权限）

### 27.2 后台前端框架

| 能力 | 说明 |
|---|---|
| 布局 | 左侧菜单 + 顶部面包屑 + 内容区 |
| 路由 | 动态路由，按角色权限过滤 |
| 菜单 | 树形，支持图标与排序 |
| 守卫 | 未登录跳登录页；无权限跳 403 |
| 登录 | 账号密码 + 验证码 |

**其他板块接入方式**：在 `web-admin/src/router/modules/` 预留空文件，各板块按 `{ path, component, meta: { title, icon, permission } }` 规范填入，主框架自动渲染菜单。

```
router/modules/
├── dashboard.js    （本板块）
├── product.js      （衣）
├── food.js         （食）
├── stay.js         （住）
├── travel.js       （行）
├── community.js    （社区）
└── system.js       （本板块）
```

### 27.3 功能清单

| 编号 | 功能 | 优先级 |
|---|---|---|
| 6.1 | 用户管理（游客列表、搜索、详情、封禁/解封、改资料） | **P0** |
| 6.2 | 商家账号管理（列表、详情、状态修改、强制下线） | **P0** |
| 6.3 | **角色权限配置（RBAC）** | **P0** |
| 6.4 | 操作日志 | P1 |
| 6.5 | **商家入驻审核**（待审/通过/驳回 Tab，查看资质，分配板块） | **P0** |
| 6.6 | **数据看板**（DAU/新增用户/订单数/GMV + 各板块维度） | **P0** |
| 6.7 | 数据导出（Excel） | P1 |
| 6.8 | 轮播图 / 推荐位 / 活动横幅 / 公告管理 | **P0** |
| 6.9 | 消息中心（群发/指定用户、模板管理、发送记录） | P1 |
| 6.10 | 财务结算（结算列表、生成结算单、对账、报表） | P1 |
| 6.11 | 全局订单查询（跨板块，按类型/状态/时间） | **P0** |
| 6.12 | 异常订单处理 / 退款审批 | P1 |
| 6.13 | 系统设置（抽佣比例、运费模板、支付配置、短信配置、敏感词库） | P1 |

### 27.4 数据实体

公共库已提供 `sys_admin`、`sys_role`、`sys_permission`、`sys_admin_role`、`sys_role_permission`、`mch_merchant`、`mch_merchant_apply`、`sys_config`、`sys_operation_log`、`cms_*`。

本板块**新增**：

| 表名 | 用途 |
|---|---|
| `fin_settlement` | 结算单 |
| `fin_settlement_item` | 结算明细 |

**fin_settlement**：`settlement_no`、`merchant_id`、`period_start`/`period_end`、`order_count`、`total_amount`（分）、`commission`（分）、`payable`（分）、`status`（1待结算 2已结算 3已取消）、`settle_time`

**fin_settlement_item**：`settlement_id`、`order_id`、`order_no`、`biz_type`、`amount`、`commission`、`payable`

### 27.5 接口

**用户/商家**：`/api/v1/admin/user/*`、`/api/v1/admin/merchant/*`、`/api/v1/admin/merchant-apply/*`

**权限**：`/api/v1/admin/role/*`、`/api/v1/admin/permission/*`、`/api/v1/admin/admin/*`

**看板**：`/api/v1/admin/stat/dashboard`、`stat/orders`、`stat/users`、`stat/content`、`stat/merchant`、`stat/finance`、`stat/export`

**运营**：`/api/v1/admin/cms/banner/*`、`cms/notice/*`、`cms/recommend/*`、`cms/activity/*`

**财务**：`/api/v1/admin/finance/settlement/*`、`finance/reconcile`

**全局订单**：`/api/v1/admin/order/list`（跨板块）、`/api/v1/admin/order/refund-approval`

**系统**：`/api/v1/admin/system/config/*`、`system/sensitive-word/*`、`system/log/*`

### 27.6 页面

| 页面 | 要素 |
|---|---|
| **数据看板** | 顶部指标卡（今日 DAU/新增用户/订单数/GMV）+ 趋势图 + 各板块订单占比 + TOP 榜 |
| 用户管理 | 表格、搜索、详情抽屉、封禁/解封 |
| 商家管理 | 列表、详情、状态修改 |
| **入驻审核** | 待审/通过/驳回 Tab、资质材料查看、通过（分配板块）/驳回（填原因） |
| 角色权限 | 角色列表 + 权限树勾选 |
| 轮播/推荐位 | 拖拽排序、跳转配置 |
| 财务结算 | 结算单列表、明细、生成、导出 |
| 全局订单 | 跨板块查询、退款审批 |
| 系统设置 | 抽佣比例、运费、敏感词库 |

### 27.7 业务规则

| 规则 | 说明 |
|---|---|
| 商家入驻审核 SLA | 3 个工作日内 |
| 财务结算周期 | T+7（每 7 天结算一次） |
| **平台抽佣默认** | 实物商品 5%；服务类（民宿/门票/餐位/路线）10% |
| 操作日志保留 | 1 年 |
| 敏感词命中 | 内容进待审核；用户累计 3 次自动禁言 24h |

### 27.8 数据看板指标

| 维度 | 指标 |
|---|---|
| 平台总览 | 今日/本周/本月 DAU、新增用户、订单数、GMV |
| 订单 | 各板块订单量、GMV、转化率 |
| 用户 | 增长趋势、按消费金额分层 |
| 内容 | 游记发布数、点赞数、热门话题 |
| 商家 | 商家数量、活跃商家、TOP 商家 |
| 财务 | 总流水、平台收入、待结算金额 |

### 27.9 与公共层对接

本板块**本身就是公共层的一部分**（`sys_*` 表归属），但同样遵守：改订单状态走 `OrderService.changeStatus()`；发消息走 `MessageService`；错误码 `80000–89999`。

### 27.10 验收要点

- [ ] 后台框架能承载其他 5 个板块的页面（路由 + 菜单 + 权限过滤）
- [ ] RBAC 生效：不同角色看到的菜单不同
- [ ] 商家入驻审核闭环（申请 → 审核 → 开通权限）
- [ ] 数据看板各指标数据正确（与真实订单对得上）
- [ ] 全局订单能查到全部 5 类订单
- [ ] 操作日志有记录

---

# 第六部分 前后端实现

## 28. 前端架构

### 28.1 三端工程与公共约定

| 端 | 目录 | 关键约定 |
|---|---|---|
| 小程序（uni-app） | `app/` | `utils/request.js` 统一拦截；`uni.setStorageSync` 持久化 token；`onReachBottom` 加载更多；`<image lazy-load>` |
| PC 网页 | `web-pc/` | Vue Router 守卫；axios 拦截器 token 注入 + 401 刷新；地图 SDK；`v-html` 前 XSS 过滤 |
| 管理后台 | `web-admin/` | 登录后获取权限码 `addRoute` 动态注册路由；`ProTable` 封装；ECharts `ChartCard` |

### 28.2 状态管理（Pinia）

```js
// store/modules/user.js
export const useUserStore = defineStore('user', {
  state: () => ({ token: '', userInfo: null }),
  actions: {
    async login(payload) { /* ... */ },
    async fetchProfile() { /* ... */ },
    logout() { /* ... */ },
  },
  persist: true, // pinia-plugin-persistedstate
})
```

### 28.3 请求封装（PC 端）

```js
// api/request.js
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 15000,
})
service.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) config.headers.Authorization = `Bearer ${userStore.token}`
  return config
})
service.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data
    if (code === 0) return data
    if (code === 10001) router.push('/login')
    return Promise.reject(new Error(message))
  },
  (err) => Promise.reject(err)
)
```

---

## 29. 后端架构与关键实现

### 29.1 分层与依赖注入（TypeScript / Midway）

```typescript
// entity/product.ts
@EntityModel('prd_goods')
@Entity()
export class ProductEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'min_price', type: 'int' })
  minPrice: number; // 单位:分

  @Column({ name: 'craft_intro', type: 'text' })
  craftIntro: string;
}

// service/product.ts
@Provide()
export class ProductService {
  @InjectEntityModel(ProductEntity)
  repo: Repository<ProductEntity>;

  async detail(id: number) {
    return this.repo.findOneBy({ id, deletedAt: null });
  }
}

// controller/product.ts
@Controller('/api/v1/product')
export class ProductController {
  @Inject()
  productService: ProductService;

  @Get('/detail')
  async detail(@Query('id') id: number) {
    return this.productService.detail(id);
  }
}
```

### 29.2 订单状态机实现

```typescript
export enum OrderStatus {
  PENDING = 'PENDING', PAID = 'PAID', CONFIRMED = 'CONFIRMED',
  ONGOING = 'ONGOING', FINISHED = 'FINISHED', REVIEWED = 'REVIEWED',
  CANCELLED = 'CANCELLED', CLOSED = 'CLOSED', REFUNDED = 'REFUNDED',
}

export const OrderTransition: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.CLOSED],
  [OrderStatus.PAID]: [OrderStatus.CONFIRMED, OrderStatus.REFUNDED],
  [OrderStatus.CONFIRMED]: [OrderStatus.ONGOING, OrderStatus.REFUNDED],
  [OrderStatus.ONGOING]: [OrderStatus.FINISHED],
  [OrderStatus.FINISHED]: [OrderStatus.REVIEWED, OrderStatus.REFUNDED],
};

export function canTransit(from: OrderStatus, to: OrderStatus): boolean {
  return OrderTransition[from]?.includes(to) ?? false;
}
```

- 状态变更统一走 `OrderService.changeStatus()`，先 `canTransit` 校验，再用乐观更新 `UPDATE ord_order SET status=:to WHERE id=:id AND status=:from`，防并发重复变更。

### 29.3 支付回调幂等

```typescript
async handleNotify(payload: any, em: EntityManager) {
  if (!this.verifySign(payload)) throw new BizError(ErrorCode.PAY_SIGN_ERROR);
  const payNo = payload.out_trade_no;
  const record = await em.findOne(PaymentRecord, { where: { payNo } });
  if (record && record.status === 'SUCCESS') return { code: 'SUCCESS' };  // 幂等
  await em.transaction(async (tx) => {
    await tx.update(PaymentRecord, { payNo }, { status: 'SUCCESS', transactionId: payload.transaction_id });
    await tx.update(Order, { orderNo: payNo, status: 'PENDING' }, { status: 'PAID', payTime: new Date() });
  });
  return { code: 'SUCCESS' };
}
```

### 29.4 全局异常过滤器

```typescript
@Catch()
export class DefaultErrorFilter {
  async catch(err: any, ctx: Context) {
    ctx.status = 200; // 业务错误统一 HTTP 200 + code
    ctx.body = { code: err.code ?? 5000, message: err.message ?? '系统错误' };
  }
}
```

### 29.5 库存扣减（乐观锁）

```typescript
async deduct(goodsId: number, count: number, tx: EntityManager) {
  const r = await tx.update(ProductEntity,
    { id: goodsId, totalStock: MoreThanOrEqual(count) },
    { totalStock: () => `total_stock - ${count}`, version: () => `version + 1` });
  if (r.affected === 0) throw new BizError(ErrorCode.STOCK_NOT_ENOUGH);
}
```

### 29.6 参数校验（DTO）

```typescript
export class CreateOrderDTO {
  @Rule(RuleType.string().required())
  bizType: string; // GOODS/SEAT/STAY/TICKET/ROUTE

  @Rule(RuleType.number().integer().min(1))
  quantity?: number;
}
```

---

# 第七部分 核心流程与时序

## 30. 时序设计

### 30.1 下单 → 支付 → 回调

```
客户端                 wudong-server(订单/支付)          微信支付
  |  1. POST /api/v1/order/create (创建订单)             |
  |------------------------------------------>|
  |  <-- 返回 orderNo + 金额，status=PENDING    |
  |  2. POST /api/v1/order/:id/pay             |
  |------------------------------------------>|
  |      生成 payment_record(PENDING)，调微信统一下单 |
  |------------------------------------------>|
  |  <-- 返回 prepay_id + 签名参数               |
  |  3. 客户端拉起微信支付，用户完成支付            |
  |  4. 微信异步回调 /api/v1/pay/notify          |
  |------------------------------------------>|
  |     验签 → 幂等判断 → 更新 status=PAID       |
  |  <-- 返回 {"code":"SUCCESS"}                 |
  |  5. 客户端查询订单，确认已支付                  |
```

- 关键点：以**回调**为准更新订单状态，客户端轮询仅作展示；回调需验签 + 幂等。

### 30.2 预订类（餐位/住宿/门票/路线）

```
选择日期/时段/房型/票种 → 校验可订（房态日历/分日期库存/时段余量）
→ 预扣 → 创建订单(PENDING) → 模拟支付 → PAID → 商家确认 → 进行中 → 完成
住宿订单支付后生成入住码；门票/路线支付后生成电子票二维码
```

### 30.3 退款

```
客户端 → POST /api/v1/order/:id/refund
  → 校验状态(可退) → 生成 refund_record → 调微信退款
  → 异步回调 → 更新 status=REFUNDED → 生成 finance_record(负向冲销)
```

### 30.4 商家入驻审核

```
商家用户提交申请(材料上传) → merchant_apply=待审
  → 后台审核通过/驳回 → 通过: merchant 创建 + 用户绑定商家角色 → 通知(站内信)
```

### 30.5 社区发帖审核

```
用户发布游记 → post.status=审核中 → 调内容审核(mock)
  → 通过 → NORMAL；不通过 → OFFLINE → 信息流仅展示 NORMAL 帖子
```

---

# 第八部分 工程实施

## 31. 安全规范

| 类别 | 措施 |
|---|---|
| 身份认证 | bcrypt（cost ≥ 10）加密密码；JWT 双 token；三端 Token 隔离 |
| 敏感信息 | 身份证 AES-256 加密存储、脱敏展示（前 6 后 4）；手机号脱敏（前 3 后 4）；密钥走环境变量 |
| 接口安全 | HTTPS 强制；TypeORM 参数化查询防注入；富文本 `sanitize-html`/DOMPurify 白名单防 XSS；登录接口限流 |
| 文件上传 | 校验 MIME 与扩展名；限制大小；UUID 重命名；内容安全审核 |
| 操作审计 | 管理员/商家写操作记 `sys_operation_log`；关键操作（支付/退款/封禁）二次验证 |
| 数据备份 | MySQL 每日 `mysqldump` 备份，保留 30 天 |

## 32. 部署方案

### 32.1 本地开发

```bash
docker compose up -d mysql redis      # 1. 起依赖
pnpm install                          # 2. 装依赖
cp .env.example .env                  # 3. 填数据库密码、JWT 密钥
pnpm run init:db                      # 4. 顺序执行 docs/database/*.sql
pnpm run dev                          # 5. http://127.0.0.1:7001
```

Swagger：`http://127.0.0.1:7001/swagger-ui/index.html`

| 命令 | 说明 |
|---|---|
| `pnpm run dev` | 开发模式热重载 |
| `pnpm run build` / `start` | 编译 / 生产启动（pm2） |
| `pnpm run test` / `cov` | 单测 / 覆盖率 |
| `pnpm run init:db` | 初始化数据库 |

### 32.2 生产部署

```
Nginx (80/443)
  ├── /            → PC 静态资源
  ├── /admin/      → 管理后台静态资源
  ├── /api/        → Node.js 后端（PM2 守护）
  └── /uploads/    → 静态文件
```

- Docker Compose 单机编排：MySQL 8 + Redis 7 + wudong-server + Nginx。
- 域名 + ICP 备案 + HTTPS；生产 `synchronize:false` + migration。

## 33. 测试策略

- **单元测试**：Jest（`@midwayjs/jest`），覆盖状态机 `canTransit`、金额/分转换、购物车逻辑、库存扣减条件。
- **接口测试**：SuperTest，重点覆盖支付回调幂等（重复回调）、退款、库存不足。
- **联调冒烟**：本地 Docker 起 MySQL/Redis → 建表 → 造种子数据 → 走通「登录→浏览→下单→支付(mock)→回调→评价」主链路。
- **覆盖率**：后端核心 service 与 API ≥ 60%。

## 34. 开发规范

### 34.1 Git 分支模型

```
main          ← 保护，只在里程碑验收时从 develop 合并
└── develop   ← 集成分支
    ├── feature/common-*     （公共层）
    └── feature/m1-* ... m6-*  （各业务板块）
```

- 各组只推自己的分支；每天开工前 `git pull origin develop`；合入需 PR + review（公共层变更 2 人 approve）。

### 34.2 Commit 规范

`<type>(<scope>): <subject>`，scope 用 `m1`~`m6` / `common`

```
feat(m3): 新增房态日历批量设置接口
fix(m1): 修复 SKU 库存并发扣减为负的问题
```

### 34.3 三条红线

1. **公共层不许单板块擅自改**，要改提 PR
2. **禁止跨板块 `import` 别人的 Service** —— 需要数据走 HTTP 或让公共层开服务
3. **状态、金额、时间、异常**这四样，全项目只有一种写法

### 34.4 UI 规范

| 项 | 值 |
|---|---|
| 主色 | 苗寨靛蓝 `#2B5C8A` |
| 辅色 | 银饰银灰 `#8A94A6` |
| 强调色 | 苗绣红 `#C1483C`（价格、促销） |
| 背景 | `#F5F6F8` |
| 圆角 | 卡片 8px / 按钮 4px |
| 组件库 | Element Plus，不引第二套 |

## 35. 里程碑计划

| 阶段 | 时间 | 目标 | 出口标准 |
|---|---|---|---|
| M0 准备 | 第 0 周 | 环境就绪 | 每人本地能起服务 |
| M1 公共层 | 第 1–2 周 | 公共能力冻结 | Swagger 出文档，各板块都能登录拿 token |
| M2 业务开发 | 第 3–5 周 | 各板块成型 | 各板块独立可演示 |
| M3 集成 | 第 6 周 | 合并成一个系统 | 一个 `npm run dev` 跑通全站主流程 |
| M4 验收 | 第 7 周 | 交付 | 需求规格书验收清单全绿 |

**主流程验收路径**：

```
注册 → 登录 → 浏览商品 → 加购 → 下单 → 支付(mock) → 我的订单
   → 预订民宿 → 支付 → 订单中心看到两类订单
   → 发布游记（带图）→ 社区首页可见
   → 商家后台登录 → 看到订单 → 发货
   → 管理员后台登录 → 看到全量订单和用户
```

## 36. 团队分工（6 人）

> 不能按"1 人 1 模块"切——前端 3 端、公共层、订单支付都需要专门人手。按"后端按模块聚类 + 前端按端 + 公共层专人"切。

| 成员 | 角色定位 | 主要负责 |
|---|---|---|
| 成员A（组长） | 架构 + 后端核心 | 公共层（用户/鉴权/购物车/上传/消息/搜索/错误码）、统一订单中心 + 支付 + 退款、server 骨架、数据库统筹、部署、进度统筹 |
| 成员B | 后端 | 衣（商品/SKU/库存）+ 食（餐厅/餐位/农产品），含收藏/评价 |
| 成员C | 后端 | 住（民宿/房型/房态/预订）+ 行（景区/票种/路线/电子票），含收藏/评价 |
| 成员D | 后端 | 社区（游记/评论/话题/点赞/关注/举报）+ 管理后台后端（商家审核/看板/财务/运营） |
| 成员E | 前端 | 小程序端（uni-app 全部模块页面）+ 前端公共库 |
| 成员F | 前端 | PC 网页（Vue3）+ 管理后台前端 |

**分工要点**：公共层最重最关键（登录、下单、支付贯穿所有模块），前期全员配合成员A；订单支付由成员A 定义契约，各业务模块只按契约提交"请求 + 类型专属字段"。

## 37. 环境搭建

### 37.1 前置软件清单

| 软件 | 版本 | 用途 |
|---|---|---|
| Node.js | 18+（建议 20/22 LTS） | 运行时 |
| pnpm | ≥ 8（可选） | 包管理 |
| Git | 2.x | 版本管理 |
| MySQL | 8.0 | 数据库（Docker 或本机） |
| Redis | 7.x | 缓存 |
| Docker Desktop | 可选（推荐） | 一键起依赖 |
| 微信开发者工具 / HBuilderX | 最新 | 小程序调试 |

### 37.2 安装步骤（按顺序）

1. 装 Node.js（LTS），验证 `node -v`、`npm -v`。
2. 配 npm 国内镜像：`npm config set registry https://registry.npmmirror.com`。
3. 装 pnpm（可选）：`npm install -g pnpm`。
4. 装 Git，配置 `user.name` / `user.email`。
5. 起 MySQL 8 + Redis 7（推荐 Docker，`docker compose up -d`）。
6. 跑通后端基座 + 后台前端模板。
7. 验证后端连库：改 `config.default.ts` 的 typeorm 连接信息，重启无报错。
8. 建前端工程：uni-app（`npx degit dcloudio/uni-preset-vue#vite`）、PC（`npm create vite@latest`）。

### 37.3 docker-compose.yml 样例

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wudong
      TZ: Asia/Shanghai
    ports: ["3306:3306"]
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    volumes: ["./data/mysql:/var/lib/mysql"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
    volumes: ["./data/redis:/data"]
```

## 38. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 某板块进度滞后 | 集成失败 | M2 结束设检查点，滞后板块砍功能保主流程 |
| 公共层设计返工 | 全项目返工 | M1 结束冻结，之后只准加不准改结构 |
| 跨板块耦合 | 集成期爆炸 | 禁止跨板块 import，目录隔离 + PR review |
| 三端风格不一致 | 观感割裂 | 统一 Element Plus + 主题变量，M1 定好 |
| 上传目录被打满 | 服务不可用 | `upload.match` 限定路径 + 每日配额 |
| 订单状态不一致 | 数据错乱 | 主表写权限只给 `OrderService` |
| 超卖 / 超订 / 超售 | 资损 | 全部用条件更新 + 乐观锁，必测并发 |
| 团队首次接触 Midway 上手慢 | 进度 | 学习清单先行；P0 用 2 周消化 |

## 39. 路演答辩准备

### 39.1 演示脚本（建议 6-8 分钟）

| 环节 | 时长 | 内容 | 主讲 |
|---|---|---|---|
| 开场 | 30s | 一句话说清项目：乌东文旅"衣食住行"一站式平台 | 成员A |
| 痛点与定位 | 1min | 3 个痛点 → 3 端 6 模块解决方案 | 成员A |
| 架构讲解 | 1min | 架构图：Midway.js 单体 + 3 端 + 公共层 | 成员A |
| 核心演示 | 3min | 主流程：登录 → 逛(衣食住行) → 下单 → 支付(mock) → 订单 → 核销/评价 | 成员A 操作 + 旁白 |
| 亮点模块 | 1.5min | 订单状态机 / 房态并发控制 / 电子票核销 / 内容审核 | 对应成员 |
| 分工与技术难点 | 1min | 6 人分工、技术难点及解决 | 成员A |
| 收尾 | 30s | 总结 + 未来展望 | 成员A |

### 39.2 PPT 结构（约 12-15 页）

封面 → 背景痛点 → 方案总览 → 技术架构 → 数据库设计 → 功能演示 → 技术亮点 → 团队分工 → 进度里程碑 → 测试质量 → 演示 → 总结展望

### 39.3 答辩常见问题与应答要点

| 评委可能问 | 应答要点 |
|---|---|
| 为什么选 Midway.js？ | 阿里系企业级、TS 类型安全、装饰器/IoC 与 Spring 类似易上手 |
| 6 人怎么保证接口不打架？ | 公共层统一 DTO/错误码 + 模块契约 + 每日站会 |
| 订单为什么 1 主表 + 5 子表？ | 统一状态机/支付/退款复用，类型专属字段存子表 |
| 库存/房态并发怎么防超卖？ | 条件 UPDATE 乐观扣减（`WHERE stock >= n`）+ 房态 `uk_room_date` 唯一约束 |
| 微信支付没有企业资质？ | 预留 Provider 适配层 + mock，接口签名不变，资质就绪切换 |
| 数据安全？ | bcrypt 密码、身份证/手机号脱敏、内容审核/举报 |

### 39.4 答辩前交付物清单

- [ ] 三端可运行演示（配好账号）
- [ ] PPT（12-15 页）
- [ ] 演示脚本 + 1 分钟兜底录屏
- [ ] DDL 建表脚本 + Swagger 接口文档
- [ ] 单元测试报告（覆盖率 ≥ 60%）
- [ ] 部署说明 + 演示账号表
- [ ] 每个成员 30 秒自我介绍

---

## 40. 附录

### 40.1 术语

| 术语 | 说明 |
|---|---|
| 业务板块 | 衣 / 食 / 住 / 行 / 社区 / 管理后台 六个业务域 |
| 公共层 | 用户、订单、文件、响应、异常等跨板块共享代码 |
| 契约冻结 | 公共接口定义确定后不再单方面修改 |
| 幂等 | 同一请求重复提交 N 次，效果与提交 1 次相同 |
| MockPay | 本地模拟支付，点击即成功 |
| 扩展表 | 各板块为统一订单补充业务字段的从表 |
| POI | Point of Interest，可被游记关联的地点（餐厅/民宿/景区） |

### 40.2 配套文件

| 文件 | 说明 |
|---|---|
| `docs/database/01-公共库DDL.sql` | 公共层建表脚本（31 张表 + 初始化数据） |
| `docs/database/02~07-板块X.sql` | 各板块建表脚本 |
| `docs/api/公共服务接口契约.yaml` | OpenAPI 3.0.3，24 个公共服务接口 |

### 40.3 学习资料

- Midway.js 官方文档：https://midwayjs.org
- TypeORM 官方文档：https://typeorm.io
- uni-app 官方文档：https://uniapp.dcloud.net.cn

### 40.4 各板块待补充

- [ ] 建表脚本 `docs/database/0N-板块X.sql`
- [ ] 各板块 ER 图
- [ ] 各板块接口清单表
- [ ] 各板块页面清单表
- [ ] 各板块单元测试与截图录屏

---

## 文档结束

> **三件事做到了，集成就不会出大事：**
> 1. 公共层不许单板块擅自改，要改提 PR
> 2. 不许跨板块 import 别人的 Service
> 3. 状态、金额、时间、异常，全项目只有一种写法
