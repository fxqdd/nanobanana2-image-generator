@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
REM ========================================
REM Git Commit Helper Script
REM ========================================

echo ========================================
echo Git Commit Helper
echo ========================================
echo.

REM Check if in Git repository
git rev-parse --git-dir >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Not a Git repository!
    echo Please run this script in a Git repository root directory.
    pause
    exit /b 1
)

REM Check Git status
echo [1/5] Checking Git status...
git status --short
echo.

REM Clear staging area
echo [2/5] Clearing staging area...
git reset HEAD . >nul 2>&1
echo.

REM Add related files
echo [3/5] Adding related files...

REM 1. Source code files
if exist src\ (
    git add src\ >nul 2>&1
)
if exist functions\ (
    git add functions\ >nul 2>&1
)

REM 2. Configuration files
if exist package.json (
    git add package.json >nul 2>&1
)
if exist package-lock.json (
    git add package-lock.json >nul 2>&1
)
if exist vite.config.js (
    git add vite.config.js >nul 2>&1
)
if exist index.html (
    git add index.html >nul 2>&1
)
if exist .gitignore (
    git add .gitignore >nul 2>&1
)

REM 3. Batch files
for %%f in (*.bat) do (
    if exist "%%f" (
        git add "%%f" >nul 2>&1
    )
)

REM 4. Markdown files
for %%f in (*.md) do (
    if exist "%%f" (
        git add "%%f" >nul 2>&1
    )
)

REM 5. Exclude sensitive files
echo [4/5] Excluding sensitive files...
git reset HEAD .env.local >nul 2>&1
git reset HEAD dist\ >nul 2>&1
git reset HEAD node_modules\ >nul 2>&1

REM Check for incorrectly marked deleted files
echo [5/5] Checking for incorrectly marked files...
for /f "usebackq tokens=2* delims= " %%a in (`git status --porcelain 2^>nul ^| findstr /b "^D" 2^>nul`) do (
    set "filePath=%%a"
    if defined filePath (
        if exist "!filePath!" (
            echo [FIX] Restoring file: !filePath!
            git restore --staged "!filePath!" >nul 2>&1
            git add "!filePath!" >nul 2>&1
        )
    )
)

echo.
echo ========================================
echo Staged files:
echo ========================================
git status --short
echo.

REM Check if there are files to commit
git diff --cached --quiet >nul 2>&1
if !errorlevel! equ 0 (
    echo [WARNING] No files to commit!
    echo Please check if there are any modified files.
    pause
    exit /b 0
)

echo ========================================
echo Ready to commit
echo ========================================
echo.

REM Auto-generate commit message
set "commitMsg="
set "hasModelAPI=0"
set "hasLocales=0"
set "hasNewAPI=0"

git diff --cached --name-only | findstr /i "modelAPI.js" >nul 2>&1
if !errorlevel! equ 0 set "hasModelAPI=1"

git diff --cached --name-only | findstr /i "locales" >nul 2>&1
if !errorlevel! equ 0 set "hasLocales=1"

git diff --cached --name-only | findstr /i "new-api-provider" >nul 2>&1
if !errorlevel! equ 0 set "hasNewAPI=1"

REM Generate commit message based on file types
if !hasNewAPI! equ 1 (
    set "commitMsg=feat: Add new API provider support for gemini-2.5-flash-image model"
) else if !hasLocales! equ 1 (
    set "commitMsg=feat: Add multilingual support for ResetPassword page SEO"
) else if !hasModelAPI! equ 1 (
    set "commitMsg=refactor: Update modelAPI.js configuration"
) else (
    set "commitMsg=chore: Update project files"
)

echo Auto-generated commit message:
echo !commitMsg!
echo.
set /p useAuto="Use this commit message? (y/n, enter n to customize): "

if /i not "!useAuto!"=="y" (
    set /p commitMsg="Enter commit message: "
    if "!commitMsg!"=="" (
        set "commitMsg=chore: Update project files"
    )
)

echo.
echo ========================================
echo Confirm commit
echo ========================================
echo Commit message: !commitMsg!
echo.
set /p confirm="Confirm commit? (y/n): "

if /i not "!confirm!"=="y" (
    echo [CANCELLED] Commit cancelled
    pause
    exit /b 0
)

REM Use temporary file for commit message
set "tempFile=%temp%\git_commit_msg_%random%.txt"
echo !commitMsg! > "%tempFile%"
git commit -F "%tempFile%"
set "commitResult=!errorlevel!"
del "%tempFile%" >nul 2>&1

if !commitResult! equ 0 (
    echo.
    echo [SUCCESS] Commit completed!
    echo.
    set /p push="Push to remote repository? (y/n): "
    if /i "!push!"=="y" (
        git push
        if !errorlevel! equ 0 (
            echo [SUCCESS] Push completed! Cloudflare will auto-deploy.
        ) else (
            echo [ERROR] Push failed, please check network connection and permissions.
        )
    ) else (
        echo [SKIPPED] Push skipped, you can run manually later: git push
    )
) else (
    echo [ERROR] Commit failed, please check error messages.
)

echo.
pause
