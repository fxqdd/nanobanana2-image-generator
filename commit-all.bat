@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

echo ========================================
echo Git Commit Helper - commit-all
echo ========================================
echo.

git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a Git repository. Run this script from the repo root.
    pause
    exit /b 1
)

echo [1/4] Working tree changes:
git status --short
echo.

echo [2/4] Staging changes...
git reset HEAD . >nul 2>&1

git add -A
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

git diff --cached --quiet >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] nothing to commit. If the list above is empty, there are no changes.
    pause
    exit /b 0
)

set "commitMsg="
set /p commitMsg="Commit message (default: chore: update project): "
if "!commitMsg!"=="" set "commitMsg=chore: update project"

echo Commit message: "!commitMsg!"
set /p confirm="Confirm commit? (y/n): "
if /i not "!confirm!"=="y" (
    echo [CANCELLED] Commit aborted.
    pause
    exit /b 0
)

git commit -m "!commitMsg!"
if errorlevel 1 (
    echo [ERROR] Commit failed. Check the error above.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Commit complete.
set /p push="Push to remote now? (y/n): "
if /i "!push!"=="y" (
    git push
    if errorlevel 1 (
        echo [ERROR] git push failed. Check network/permissions.
    ) else (
        echo [SUCCESS] Push done. Cloudflare will deploy automatically.
    )
) else (
    echo [SKIPPED] Push skipped. You can run: git push
)

echo.
pause