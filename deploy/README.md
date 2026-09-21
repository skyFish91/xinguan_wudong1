# 乌东文旅平台 Docker 部署说明

## 一、架构

| 容器 | 镜像 | 端口映射 | 说明 |
| --- | --- | --- | --- |
| wudong-mysql | mysql:8.0 | 3306 | 首次启动自动执行 `sql/01-ddl.sql` + `sql/02-dml.sql` |
| wudong-redis | redis:7-alpine | 不对外 | 首页/详情等热点缓存 |
| wudong-server | 本地构建（server/Dockerfile） | 7001 | Midway 后端，多阶段构建 |
| wudong-web | 本地构建（web/Dockerfile） | 8081 | PC 端，Vite 构建 + nginx 托管 |
| wudong-admin | 本地构建（admin/Dockerfile） | 8082 | 管理后台，Vite 构建 + nginx 托管 |

nginx 容器内部将 `/api`、`/uploads` 反向代理到 `server:7001`，前端无需任何环境相关配置。

## 二、一键部署

```bash
cd deploy
docker compose up -d --build
```

完成后访问：

- PC 端：http://<服务器IP>:8081
- 管理后台：http://<服务器IP>:8082
- API 文档（Swagger）：http://<服务器IP>:7001/swagger-ui/index.html

## 三、配置

复制 `.env.example` 为 `.env` 可修改密码与端口，全部有默认值：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| MYSQL_ROOT_PASSWORD | root | MySQL root 密码（后端同步使用） |
| WEB_PORT | 8081 | PC 端对外端口 |
| ADMIN_PORT | 8082 | 管理后台对外端口 |
| SERVER_PORT | 7001 | 后端对外端口 |
| JWT_SECRET | wudong-jwt-secret-2026 | JWT 签名密钥，生产环境务必修改 |

## 四、常用命令

```bash
docker compose ps                  # 查看容器状态
docker compose logs -f server      # 跟踪后端日志
docker compose down                # 停止（保留数据卷）
docker compose down -v             # 停止并清空数据（下次启动重新初始化库）
```

## 五、CI/CD 流水线

流水线文件：`.github/workflows/ci.yml`，推送到 GitHub 后自动触发（main 分支推送或任意 PR）：

| 阶段 | 内容 |
| --- | --- |
| server-ci | 后端 TS 编译 + 单元测试（启动真实 MySQL 8.0 服务容器，`scripts/prepare-test-db.js` 自动初始化 wudong_test 库；静态检查 ESLint 未启用——eslint 依赖未安装，见 docs/10 流水线记录） |
| web-ci / admin-ci | 前端类型检查 + Vite 生产构建 |
| docker-build | 依次构建三个应用镜像，验证 Dockerfile 可用 |

服务器上的持续部署：仓库推送后登录服务器执行 `deploy/deploy.sh`（构建镜像、启动服务、健康检查），或手动 `cd deploy && docker compose up -d --build`。

## 六、注意事项

1. MySQL 初始化脚本只在**数据卷首次创建**时执行，后续修改 SQL 需 `docker compose down -v` 重建
2. 上传文件存于 `uploads-data` 数据卷，`down` 不带 `-v` 不会丢失
3. 修改代码后重新执行 `docker compose up -d --build` 即可增量更新
4. 若拉取基础镜像缓慢，可给 Docker Desktop 配置镜像加速器；VPN 开启时 Docker 流量可能被劫持，拉取失败可先关闭 VPN
5. SQL 初始化文件（sql/01-ddl.sql、02-dml.sql）开头已带 `SET NAMES utf8mb4;`，新增 SQL 文件时请保留，否则中文种子数据会乱码
6. 种子占位图随 server 镜像分发（Dockerfile 中 COPY uploads/seeds），修改图片后需 `docker compose up -d --build` 重新构建并清空 uploads-data 卷才能生效

## 七、日常与演示的两个辅助脚本（项目根目录）

| 脚本 | 用法 | 作用 |
| --- | --- | --- |
| `start-dev.bat` | 双击运行 | 一键拉起开发环境（MySQL/Redis/后端 7001/前端 5173），就绪后自动打开浏览器 http://localhost:5173/ ，适合日常本地开发 |
| `allow-firewall.bat` | 右键"以管理员身份运行"（一次即可） | 放行 8081/8082 入站端口，让同一网络的其他电脑通过 http://本机IP:8081/ 访问演示（IP 用 ipconfig 查询；校园网存在设备隔离时改用手机热点） |
