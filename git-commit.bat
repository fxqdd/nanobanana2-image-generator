@echo off
chcp 65001 >nul
REM Git commit script - Security fix (Windows version)
REM This script will commit code, but exclude .env.local and dist/ directory

echo [INFO] Checking Git status...
git status

echo.
echo [INFO] Adding modified files (excluding .env.local and dist/)...

REM First, ensure .env.local and dist/ are not in staging area
git reset HEAD .env.local 2>nul
git reset HEAD dist/ 2>nul

REM Then add files to commit
git add src/utils/modelAPI.js
git add .gitignore
git add SECURITY_FIX.md
git add COMMIT_GUIDE.md
git add git-commit.bat
git add git-commit.sh

REM Ensure .env.local and dist/ won't be committed (double check)
git reset HEAD .env.local 2>nul
git reset HEAD dist/ 2>nul

echo.
echo [SUCCESS] Files added to staging:
git status --short

echo.
echo [INFO] Ready to commit...
echo Commit message: Security fix: Remove hardcoded API keys and fix modelAPI.js errors
echo.
set /p confirm="Confirm commit? (y/n): "

if /i "%confirm%"=="y" (
    git commit -m "Security fix: Remove hardcoded API keys and fix modelAPI.js errors

- Remove hardcoded Volcano API key from modelAPI.js
- Fix syntax errors in modelAPI.js (remove duplicate methods)
- Update .gitignore to exclude all .env files
- Add SECURITY_FIX.md with security guidelines"
    
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

