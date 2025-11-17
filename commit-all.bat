@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

REM ========================================
REM Simple Git Commit Helper (commit-all.bat)
REM - 一次性暫存所有變更（遵守 .gitignore）
REM - 自動排除 dist / node_modules / .env*
REM - 適合現在這種「改了很多地方，怕漏提交」的情況
REM ========================================

echo ========================================
echo Git Commit Helper - commit-all
echo ========================================
echo.

REM 1. 確認在 Git 倉庫根目錄
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a Git repository!
    echo 請在項目根目錄運行本腳本。
    pause
    exit /b 1
)

REM 2. 顯示當前變更
echo [1/4] Working tree changes:
git status --short
echo.

REM 3. 重新整理暫存區並暫存所有變更
echo [2/4] Staging changes...
git reset HEAD . >nul 2>&1

REM 3.1 暫存所有遵守 .gitignore 的變更（新增 / 修改 / 刪除）
git add -A

REM 3.2 排除不需要提交的內容
git reset HEAD dist/ >nul 2>&1
git reset HEAD node_modules/ >nul 2>&1
git reset HEAD .env >nul 2>&1
git reset HEAD .env.* >nul 2>&1

echo.
echo Staged files:
echo --------------------------
git diff --cached --name-status
echo --------------------------
echo.

REM 4. 判斷是否有暫存變更
git diff --cached --quiet >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] 暫存區沒有任何變更可提交。
    echo 如果上面列表是空的，說明目前沒有需要提交的修改。
    pause
    exit /b 0
)

REM 5. 輸入提交信息
set "commitMsg="
set /p commitMsg="請輸入提交說明(直接回車使用默認 'chore: update project'): "
if "!commitMsg!"=="" (
    set "commitMsg=chore: update project"
)

echo.
echo Commit message: "!commitMsg!"
set /p confirm="確認提交? (y/n): "
if /i not "!confirm!"=="y" (
    echo [CANCELLED] 已取消提交。
    pause
    exit /b 0
)

git commit -m "!commitMsg!"
if errorlevel 1 (
    echo [ERROR] Commit 失敗，請檢查上方錯誤信息。
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Commit 完成。
set /p push="需要 push 到遠程倉庫嗎? (y/n): "
if /i "!push!"=="y" (
    git push
    if errorlevel 1 (
        echo [ERROR] git push 失敗，請檢查網絡或權限。
    ) else (
        echo [SUCCESS] Push 完成，Cloudflare 將自動部署最新版本。
    )
) else (
    echo [SKIPPED] 已跳過 push，你可以之後手動運行: git push
)

echo.
pause


