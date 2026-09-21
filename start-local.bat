@echo off
REM ============================================================
REM  乌东文旅平台 - 本地一键启动脚本
REM  Server:  http://127.0.0.1:7001
REM  Admin:   http://localhost:5190
REM ============================================================
chcp 65001 >nul
setlocal

set "PROJECT_ROOT=%~dp0"
set "SERVER_DIR=%PROJECT_ROOT%server"
set "ADMIN_DIR=%PROJECT_ROOT%admin"

set "NODE_ENV=local"

REM ---- 检查本地配置 ----
if not exist "%SERVER_DIR%\.env" (
    echo [ERROR] %SERVER_DIR%\.env 缺失，请先复制 .env.example 为 .env，并填写自己的数据库密码
    pause
    exit /b 1
)

REM ---- 检查依赖 ----
if not exist "%SERVER_DIR%\node_modules" (
    echo [ERROR] %SERVER_DIR%\node_modules 缺失，请先安装 server 依赖
    pause
    exit /b 1
)
if not exist "%ADMIN_DIR%\node_modules" (
    echo [ERROR] %ADMIN_DIR%\node_modules 缺失，请先安装 admin 依赖
    pause
    exit /b 1
)

REM ---- 检查端口 ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":7001 "') do (
    echo [WARN] 端口 7001 已被 PID %%a 占用，尝试结束...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5190 "') do (
    echo [WARN] 端口 5190 已被 PID %%a 占用，尝试结束...
    taskkill /F /PID %%a >nul 2>&1
)

REM ---- 启动 Server ----
echo [1/2] 启动 Server (端口 7001)...
start "wudong-server" cmd /k "cd /d %SERVER_DIR% && set NODE_ENV=%NODE_ENV%&& npm run dev"

REM ---- 启动 Admin ----
echo [2/2] 启动 Admin (端口 5190)...
start "wudong-admin" cmd /k "cd /d %ADMIN_DIR% && node node_modules/vite/bin/vite.js"

echo.
echo ============================================================
echo  Server:  http://127.0.0.1:7001
echo  Admin:   http://localhost:5190
echo.
echo  登录账号（来自 sql/02-dml.sql）：
echo    平台管理员: 13800000000 / admin123
echo    商家账号:   13800000002 ~ 13800000005 / merchant123
echo ============================================================
echo.
pause
endlocal
