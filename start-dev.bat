@echo off
chcp 65001 >nul
title 乌东文旅 开发环境一键启动

set ROOT=%~dp0

echo ============================================
echo  乌东文旅开发环境启动（逐项检查并拉起）
echo ============================================
echo.

echo [1/4] 检查 MySQL（端口 3306）...
netstat -ano | findstr ":3306 " >nul
if not errorlevel 1 goto mysql_done
echo       MySQL 未运行，尝试启动服务 MySQL80...
net start MySQL80 >nul 2>&1
if not errorlevel 1 goto mysql_done
echo       MySQL 启动失败（需要管理员权限），请右键本脚本"以管理员身份运行"
pause
exit /b 1
:mysql_done
echo       MySQL 已在运行

echo [2/4] 检查 Redis（端口 6379）...
netstat -ano | findstr ":6379 " >nul
if not errorlevel 1 goto redis_done
echo       Redis 未运行，准备 Docker 环境...
docker info >nul 2>&1
if errorlevel 1 (
    echo       启动 Docker Desktop 并等待引擎就绪...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
)
set /a wait_count=0
:wait_docker
%SystemRoot%\System32\timeout.exe /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
set /a wait_count+=1
if %wait_count% lss 60 goto wait_docker
echo       Docker 引擎 3 分钟未就绪，请手动打开 Docker Desktop 后重跑本脚本
pause
exit /b 1
:docker_ok
echo       启动 Redis 容器 wudong-dev-redis...
docker start wudong-dev-redis >nul 2>&1
if errorlevel 1 (
    docker run -d --name wudong-dev-redis -p 6379:6379 --restart unless-stopped redis:7-alpine >nul 2>&1
)
set /a redis_count=0
:wait_redis
%SystemRoot%\System32\timeout.exe /t 2 /nobreak >nul
netstat -ano | findstr ":6379 " >nul
if not errorlevel 1 goto redis_done
set /a redis_count+=1
if %redis_count% lss 30 goto wait_redis
echo       Redis 1 分钟未就绪，请检查 Docker Desktop 运行状态后重跑本脚本
pause
exit /b 1
:redis_done
echo       Redis 已在运行

echo [3/4] 检查后端（端口 7001）...
netstat -ano | findstr ":7001 " >nul
if not errorlevel 1 goto server_done
echo       启动后端（新窗口，约 20 秒就绪）...
start "wudong-server" /D "%ROOT%server" cmd /k "chcp 65001 >nul && npm run dev"
set /a server_count=0
:wait_server
%SystemRoot%\System32\timeout.exe /t 2 /nobreak >nul
netstat -ano | findstr ":7001 " >nul
if not errorlevel 1 goto server_done
set /a server_count+=1
if %server_count% lss 45 goto wait_server
echo       后端 90 秒未就绪，请查看标题为 wudong-server 窗口中的报错
pause
exit /b 1
:server_done
echo       后端已就绪

echo [4/4] 检查前端（端口 5173）...
netstat -ano | findstr ":5173 " >nul
if not errorlevel 1 goto web_done
echo       启动前端（新窗口，约 10 秒就绪）...
start "wudong-web" /D "%ROOT%web" cmd /k "chcp 65001 >nul && npm run dev"
set /a web_count=0
:wait_web
%SystemRoot%\System32\timeout.exe /t 2 /nobreak >nul
netstat -ano | findstr ":5173 " >nul
if not errorlevel 1 goto web_done
set /a web_count+=1
if %web_count% lss 30 goto wait_web
echo       前端 60 秒未就绪，请查看标题为 wudong-web 窗口中的报错
pause
exit /b 1
:web_done
echo       前端已就绪

echo.
echo ============================================
echo  四个服务全部就绪，浏览器打开 http://localhost:5173/
echo ============================================
start http://localhost:5173/
pause
