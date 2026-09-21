@echo off
chcp 65001 >nul
title 乌东文旅 防火墙放行（需管理员）

echo ============================================
echo  放行 8081（游客端）与 8082（管理后台）入站端口
echo  作用：同一网络（如教室 WiFi）的其他电脑可以
echo        通过 http://本机IP:8081/ 访问演示
echo ============================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo 当前不是管理员权限，请右键本脚本选择"以管理员身份运行"
    pause
    exit /b 1
)

netsh advfirewall firewall show rule name="wudong-web-8081" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="wudong-web-8081" dir=in action=allow protocol=TCP localport=8081 >nul
    echo 已添加规则：8081 游客端
) else (
    echo 规则已存在：8081 游客端
)

netsh advfirewall firewall show rule name="wudong-admin-8082" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="wudong-admin-8082" dir=in action=allow protocol=TCP localport=8082 >nul
    echo 已添加规则：8082 管理后台
) else (
    echo 规则已存在：8082 管理后台
)

echo.
echo 完成。同一网络的同学现在可以通过以下地址访问（IP 用 ipconfig 查询）：
echo   http://你的电脑IP:8081/
echo   http://你的电脑IP:8082/
echo.
pause
