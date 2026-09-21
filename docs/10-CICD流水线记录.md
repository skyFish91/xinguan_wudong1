# CI/CD 流水线记录

> 对应课程第 3 天（9 月 9 日）核心产出
> 文档版本：V1.0 ｜ 编制日期：2026-09-09 ｜ 设计人：唐晶

## 1. 流水线设计

流水线文件：`.github/workflows/ci.yml`，触发条件：push 到 main 分支或任意 Pull Request。

```
push / PR
  ├─► server-ci    后端：TS 编译 → 单元测试（真实 MySQL 8.0 服务容器）
  ├─► web-ci       PC 端：npm ci → 类型检查 + Vite 生产构建
  ├─► admin-ci     管理后台：npm ci → 类型检查 + Vite 生产构建
  └─► docker-build 依赖前三个全部通过后：依次构建三个应用镜像，验证 Dockerfile
```

## 2. 各阶段说明

### 2.1 server-ci（后端）

| 步骤 | 内容 |
| --- | --- |
| 环境 | ubuntu-latest + Node 20，npm 依赖缓存 |
| 服务容器 | mysql:8.0（MYSQL_ROOT_PASSWORD=root，healthcheck 就绪后进入下一步） |
| 测试库初始化 | `node scripts/prepare-test-db.js`：读取 01-ddl.sql 将库名替换为 wudong_test 后执行（幂等，与本地同一脚本） |
| 静态检查 | 未启用：eslint 依赖未安装（package.json 的 lint 脚本保留但暂不执行，ci.yml 中对应步骤已注释并注明启用条件） |
| 编译 | `npm run build`（midway 生产构建） |
| 单元测试 | `npm test`：Jest + 真实 MySQL，227 用例串行执行，覆盖率门槛 60% |

### 2.2 web-ci / admin-ci（前端）

`npm run build` 含 `vue-tsc --noEmit` 类型检查，任何类型错误都会阻断流水线；通过即产出可部署的 dist。

### 2.3 docker-build（镜像验证）

验证三个 Dockerfile 可正常构建，防止部署阶段才发现镜像构建问题（本课程无镜像仓库，构建产物不推送；接入 registry 后可扩展 push 步骤）。

## 3. 与本地开发的一致性设计

- **同一测试脚本**：`scripts/prepare-test-db.js` 本地与 CI 共用，杜绝"本地能跑 CI 跑不了"
- **同一数据库事实**：CI 测试连接真实 MySQL（非 SQLite 替代），与生产同源，SQL 方言差异问题（如 TRUNCATE 多表限制）在 CI 同样会被测出
- **同一构建命令**：CI 的 build/test 命令与开发者本地执行的完全一致

## 4. 持续部署（CD）方案

无云服务器条件的课程环境采用"流水线 + 手动部署"：

1. 代码 push 后 CI 自动完成校验（构建/测试/镜像验证）
2. 全部绿灯后，登录服务器执行 `deploy/deploy.sh`：构建镜像、启动容器、健康检查

接入云服务器后可扩展为：docker-build 阶段构建并 push 镜像仓库 → 服务器 webhook/SSH 触发 `docker compose pull && up -d`，即可升级为完整 CD。

## 5. 执行记录

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| ci.yml 流水线文件 | 已交付 | 推送 GitHub 后自动生效 |
| 流水线内全部命令 | 本地等效验证通过 | build/test 本地全部通过（测试 227/227，覆盖率 80.74%）；lint 未启用（eslint 依赖未安装，见 2.1 静态检查说明）；前端两工程 build 通过 |
| Docker 镜像构建 | 本地等效验证通过 | 三个镜像构建成功并完成五容器联调 |
| GitHub Actions 实跑 | 待接入 | 项目暂未推送 GitHub 仓库（本地无 git 初始化），推送后按第三节验证 |

## 6. 后续接入 GitHub 的步骤

```bash
git init
git add .
git commit -m "init: 乌东文旅平台"
git remote add origin <仓库地址>
git push -u origin main
```

推送后即可在仓库 Actions 页观察流水线运行；如测试库初始化失败，检查 mysql 服务容器日志（Actions 界面可见全部步骤输出）。
