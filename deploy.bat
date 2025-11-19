@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo ========================================
echo   Cloudflare Pages 部署助手
echo ========================================
echo.

git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [错误] 当前目录不是 Git 仓库
    pause
    exit /b 1
)

echo 📋 当前 Git 状态:
git status --short
echo.

set /p addAll="是否添加所有修改的文件? (y/n, 默认: y): "
if /i "!addAll!"=="" set "addAll=y"
if /i "!addAll!"=="y" (
    echo 📦 添加文件到暂存区...
    git add -A
    git reset HEAD dist/ >nul 2>&1
    git reset HEAD node_modules/ >nul 2>&1
    git reset HEAD .env >nul 2>&1
    git reset HEAD ".env.*" >nul 2>&1
    echo ✓ 文件已添加
)

echo.
echo 📝 已暂存的文件:
git diff --cached --name-status
echo.

git diff --cached --quiet >nul 2>&1
if not errorlevel 1 (
    echo [警告] 没有文件被暂存，请先运行 git add
    pause
    exit /b 0
)

set "defaultMsg=fix: 修复登录系统和UI翻译问题"
set /p commitMsg="💬 提交信息 (默认: %defaultMsg%): "
if "!commitMsg!"=="" set "commitMsg=%defaultMsg%"

echo.
echo 提交信息: "!commitMsg!"
set /p confirm="确认提交并推送到远程仓库? (y/n): "
if /i not "!confirm!"=="y" (
    echo [取消] 操作已取消
    pause
    exit /b 0
)

echo.
echo 📤 提交更改...
git commit -m "!commitMsg!"
if errorlevel 1 (
    echo [错误] Git 提交失败
    pause
    exit /b 1
)

echo.
echo 🚀 推送到远程仓库...
git push
if errorlevel 1 (
    echo [错误] Git 推送失败
) else (
    echo.
    echo ========================================
    echo   ✓ 部署成功!
    echo ========================================
    echo.
    echo 📌 Cloudflare Pages 会自动检测推送并开始部署
    echo    请前往 Cloudflare Dashboard 查看部署状态
    echo.
)

pause

