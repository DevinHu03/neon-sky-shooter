@echo off
title Neon Sky Shooter - GPU High Performance Launcher
cd /d "%~dp0"

echo =========================================================
echo   NEON SKY SHOOTER · 霓虹空战 - 极速本地启动器
echo =========================================================
echo.
echo [1/2] 正在检测本地运行环境...
echo [2/2] 正在启动网页游戏...
echo.

start "" "http://localhost:8080/index.html"
npx --yes serve -l 8080 . 2>nul || python -m http.server 8080 2>nul || start "" "index.html"
