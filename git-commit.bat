@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
REM Git commit script - Universal version
REM This script will commit code, but exclude .env.local and dist/ directory
REM Supports multiple commit types: security fixes, multilingual updates, etc.

echo [INFO] Checking Git status...
git status

echo.
echo [INFO] Select commit type:
echo 1. Security fix (modelAPI.js, .gitignore, security docs)
echo 2. Multilingual support (locales files, ResetPassword.jsx)
echo 3. All modified files (excluding .env.local and dist/)
echo.
set /p commitType="Enter choice (1/2/3): "

REM Clean input - remove spaces and newlines
set "commitType=%commitType: =%"
set "commitType=%commitType:~0,1%"

echo.
echo [INFO] Adding modified files (excluding .env.local and dist/)...

REM First, ensure .env.local and dist/ are not in staging area
git reset HEAD .env.local 2>nul
git reset HEAD dist/ 2>nul

REM Add files based on commit type
if "!commitType!"=="1" (
    echo [INFO] Adding security fix files...
    git add src/utils/modelAPI.js
    git add .gitignore
    git add SECURITY_FIX.md
    git add COMMIT_GUIDE.md
    git add git-commit.bat
    git add git-commit.sh
    set "commitMsg=Security fix: Remove hardcoded API keys and fix modelAPI.js errors - Remove hardcoded Volcano API key from modelAPI.js - Fix syntax errors in modelAPI.js (remove duplicate methods) - Update .gitignore to exclude all .env files - Add SECURITY_FIX.md with security guidelines"
) else if "!commitType!"=="2" (
    echo [INFO] Adding multilingual support files...
    git add src/pages/ResetPassword.jsx
    git add src/locales/zh.js
    git add src/locales/en.js
    git add src/locales/ja.js
    git add src/locales/fr.js
    git add src/locales/de.js
    git add src/locales/ru.js
    set "commitMsg=feat: Add multilingual support for ResetPassword page SEO - Add seo.resetPassword translations to all language files (zh, en, ja, fr, de, ru) - Update ResetPassword.jsx to use translation keys instead of hardcoded text - Improve SEO keywords internationalization"
) else if "!commitType!"=="3" (
    echo [INFO] Adding all modified files...
    git add -u
    REM Exclude .env.local and dist/ explicitly
    git reset HEAD .env.local 2>nul
    git reset HEAD dist/ 2>nul
    set /p customMsg="Enter custom commit message (or press Enter for default): "
    if "!customMsg!"=="" (
        set "commitMsg=chore: Update project files"
    ) else (
        set "commitMsg=!customMsg!"
    )
) else (
    echo [ERROR] Invalid choice: "!commitType!". Exiting.
    pause
    exit /b 1
)

REM Ensure .env.local and dist/ won't be committed (double check)
git reset HEAD .env.local 2>nul
git reset HEAD dist/ 2>nul

echo.
echo [SUCCESS] Files added to staging:
git status --short

echo.
echo [INFO] Ready to commit...
echo Commit message:
echo !commitMsg!
echo.
set /p confirm="Confirm commit? (y/n): "

if /i "%confirm%"=="y" (
    REM Create a temporary file for commit message to handle special characters
    set "tempFile=%temp%\git_commit_msg_%random%.txt"
    echo !commitMsg! > "%tempFile%"
    git commit -F "%tempFile%"
    del "%tempFile%" 2>nul
    
    echo.
    echo [SUCCESS] Commit successful!
    echo.
    set /p push="Push to remote repository? (y/n): "
    if /i "%push%"=="y" (
        git push
        echo [SUCCESS] Push successful!
    ) else (
        echo [INFO] Push skipped. You can push later manually: git push
    )
) else (
    echo [CANCELLED] Commit cancelled
)

pause

