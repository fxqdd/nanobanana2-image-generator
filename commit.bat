@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
REM ========================================
REM 简化的 Git 提交脚本
REM 自动检测并提交相关文件，不会删除任何文件
REM ========================================

echo ========================================
echo Git 提交助手
echo ========================================
echo.

REM 检查 Git 状态
echo [1/5] 检查 Git 状态...
git status --short
echo.

REM 清除暂存区，重新开始
echo [2/5] 清理暂存区...
git reset HEAD . 2>nul
echo.

REM 自动添加相关文件（智能检测）
echo [3/5] 添加相关文件...

REM 1. 代码文件（始终添加修改的）
git add src/ 2>nul
git add functions/ 2>nul

REM 2. 配置文件
if exist "package.json" git add package.json 2>nul
if exist "package-lock.json" git add package-lock.json 2>nul
if exist "vite.config.js" git add vite.config.js 2>nul
if exist "index.html" git add index.html 2>nul
if exist ".gitignore" git add .gitignore 2>nul

REM 3. 脚本文件
if exist "*.bat" (
    for %%f in (*.bat) do (
        if exist "%%f" git add "%%f" 2>nul
    )
)

REM 4. 文档文件（只添加存在的）
if exist "*.md" (
    for %%f in (*.md) do (
        if exist "%%f" git add "%%f" 2>nul
    )
)

REM 5. 排除敏感文件和目录
echo [4/5] 排除敏感文件...
git reset HEAD .env.local 2>nul
git reset HEAD dist/ 2>nul
git reset HEAD node_modules/ 2>nul

REM 检查是否有文件被错误标记为删除，如果有则恢复
echo [5/5] 检查并修复错误标记...
for /f "tokens=2" %%f in ('git status --porcelain ^| findstr "^D"') do (
    if exist "%%f" (
        echo [修复] 恢复文件: %%f
        git restore --staged "%%f" 2>nul
        git add "%%f" 2>nul
    )
)

echo.
echo ========================================
echo 暂存的文件列表：
echo ========================================
git status --short
echo.

REM 检查是否有文件要提交
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo [警告] 没有文件需要提交！
    echo 请检查是否有文件被修改。
    pause
    exit /b 0
)

echo ========================================
echo 准备提交
echo ========================================
echo.

REM 自动生成提交信息
set "commitMsg="
set "hasModelAPI=0"
set "hasLocales=0"
set "hasNewAPI=0"

git diff --cached --name-only | findstr /i "modelAPI.js" >nul
if !errorlevel! equ 0 set "hasModelAPI=1"

git diff --cached --name-only | findstr /i "locales" >nul
if !errorlevel! equ 0 set "hasLocales=1"

git diff --cached --name-only | findstr /i "new-api-provider" >nul
if !errorlevel! equ 0 set "hasNewAPI=1"

REM 根据文件类型生成提交信息
if !hasNewAPI! equ 1 (
    set "commitMsg=feat: Add new API provider support for gemini-2.5-flash-image model"
) else if !hasLocales! equ 1 (
    set "commitMsg=feat: Add multilingual support for ResetPassword page SEO"
) else if !hasModelAPI! equ 1 (
    set "commitMsg=refactor: Update modelAPI.js configuration"
) else (
    set "commitMsg=chore: Update project files"
)

echo 自动生成的提交信息：
echo !commitMsg!
echo.
set /p useAuto="使用此提交信息? (y/n，输入 n 可自定义): "

if /i not "!useAuto!"=="y" (
    set /p commitMsg="请输入提交信息: "
    if "!commitMsg!"=="" (
        set "commitMsg=chore: Update project files"
    )
)

echo.
echo ========================================
echo 确认提交
echo ========================================
echo 提交信息: !commitMsg!
echo.
set /p confirm="确认提交? (y/n): "

if /i not "!confirm!"=="y" (
    echo [取消] 提交已取消
    pause
    exit /b 0
)

REM 使用临时文件提交，避免打开编辑器
set "tempFile=%temp%\git_commit_msg_%random%.txt"
echo !commitMsg! > "%tempFile%"
git commit -F "%tempFile%"
del "%tempFile%" 2>nul

if %errorlevel% equ 0 (
    echo.
    echo [成功] 提交完成！
    echo.
    set /p push="推送到远程仓库? (y/n): "
    if /i "!push!"=="y" (
        git push
        if !errorlevel! equ 0 (
            echo [成功] 推送完成！Cloudflare 将自动部署。
        ) else (
            echo [错误] 推送失败，请检查网络连接和权限。
        )
    ) else (
        echo [跳过] 推送已跳过，您可以稍后手动运行: git push
    )
) else (
    echo [错误] 提交失败，请检查错误信息。
)

echo.
pause

