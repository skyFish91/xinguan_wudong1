#!/usr/bin/env bash
# 乌东文旅平台一键部署脚本（服务器执行）：构建镜像、启动全部服务、等待后端就绪
set -e
cd "$(dirname "$0")"

SERVER_PORT="${SERVER_PORT:-7001}"
WEB_PORT="${WEB_PORT:-8081}"
ADMIN_PORT="${ADMIN_PORT:-8082}"

echo "开始构建并启动服务..."
docker compose up -d --build

echo "等待后端就绪..."
for i in $(seq 1 30); do
  if curl -sfL -m 3 "http://127.0.0.1:${SERVER_PORT}/api/home/" > /dev/null 2>&1; then
    echo "部署完成："
    echo "  PC 端     http://<服务器IP>:${WEB_PORT}"
    echo "  管理后台  http://<服务器IP>:${ADMIN_PORT}"
    exit 0
  fi
  sleep 5
done

echo "后端未在预期时间内就绪，请查看日志：docker compose logs server"
exit 1
