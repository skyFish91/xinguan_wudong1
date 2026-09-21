---
name: wudong-dev
description: 乌东文旅平台开发规范。修改/新增本项目（Midway + Vue 3 模块化单体）任何代码前必读：技术栈、目录约定、命名规范、数据库表、统一响应、鉴权装饰器、模拟支付与上传约定。
---

# 乌东文旅平台开发规范

本 Skill 是"专业应用实战"课程第 2 天产出，供 Claude Code 在开发本项目时遵循。

## 1. 项目结构

- `server/`：Midway（Node.js + TypeScript）后端，模块化单体
  - `src/module/<域>/`：controller.ts / service.ts / dto.ts 按模块放置
  - `src/entity/`：TypeORM 实体
  - `src/common/`：统一响应、错误码、装饰器
  - `src/middleware/`：鉴权、日志、错误处理
- `web/`：Vue 3 + Vite + Element Plus + Pinia PC 前端（端口 5173）
- `admin/`：Vue 3 管理后台（端口 5174）
- `sql/`：01-ddl.sql、02-dml.sql

## 2. 命名规范

- 数据库表：`t_` 前缀蛇形命名，如 `t_product`、`t_room_inventory`
- 后端路由：`/api/<模块>/<资源>`，如 `/api/clothing/products`
- 实体类：帕斯卡命名，如 `ProductEntity`；Service：如 `ProductService`
- 前端 API 封装：`web/src/api/<模块>.js` 与后端路由一一对应
- 提交信息：`[模块] 说明`，如 `[衣] 商品列表接口`

## 3. 统一响应格式

```json
{ "code": 0, "message": "success", "data": {} }
```

- 业务成功返回 `data`，失败抛 `BizError`（错误码 + 中文提示）
- 错误码：1xxx 认证、2xxx 参数、3xxx 业务、5xxx 系统
- 分页返回：`{ list, total, page, pageSize }`

## 4. 鉴权装饰器（必须使用）

```ts
@Auth()                    // 任意登录用户
@Auth('admin')             // 仅平台管理员
@Auth('merchant')          // 任意商家
@Auth('merchant', 'clothing') // 衣模块商家（food/hotel/travel 同理）
```

- JWT 双 token：access 2h / refresh 7d，前端 axios 拦截器自动续期
- 用户角色：`user | merchant | admin`，商家带 `merchantType`

## 5. 数据库约定

- 主键 `id` BIGINT 自增；`created_at` / `updated_at` 时间戳由 TypeORM 自动维护
- 订单状态机：待支付 → 已支付/待确认 → 已确认 → 进行中 → 已完成（可取消/退款分支）
- 库存防超卖：SKU 用 `UPDATE ... SET stock = stock - n WHERE stock >= n` 条件更新
- 房态/票务库存：`(room_id|ticket_id, date)` 联合唯一行，预扣后超时释放

## 6. 模拟方案（无真实外部服务）

- 短信验证码：固定 `123456`，存入 Redis `sms:code:{phone}` 5 分钟
- 微信支付：`/api/pay/...` 返回模拟二维码页数据，点击"模拟扫码支付"触发回调
- 地图：不接真实地图 SDK，用地址文字 + 坐标字段展示
- 文件上传：存 `server/uploads/`，静态服务 `/uploads/**` 对外访问

## 7. 代码风格

- 后端：Midway 装饰器风格，Controller 只做参数校验与转发，业务在 Service
- DTO 用 class-validator 校验，必填/长度/格式都有注解
- 前端：Vue 3 `<script setup>` 组合式 API；接口调用统一走 `api/` 封装层，禁止页面内裸写 axios
- 注释用中文；敏感字段（手机号/身份证）展示前脱敏

## 8. 常见任务流程

1. **加一个后端模块**：建 `src/module/<域>/` → entity → controller + service + dto → 注册到 `configuration.ts` 的 imports
2. **加前端页面**：`web/src/views/<域>/` → `web/src/api/<域>.js` → 路由懒加载注册
3. **改表结构**：同步更新 `sql/01-ddl.sql` 与 `docs/12-数据库设计文档.md`
4. **跑测试**：`cd server && npm test`（覆盖率报告在 `coverage/`）
