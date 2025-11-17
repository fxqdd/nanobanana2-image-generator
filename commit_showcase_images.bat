@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo Adding showcase images and updated files...
git add public/images/showcase/
git add src/pages/Showcase.jsx

echo.
echo Staged files:
git status --short

echo.
echo Committing changes...

REM Use temporary file for commit message to handle multi-line text
set "tempFile=%temp%\git_commit_msg_%random%.txt"
(
echo feat: Add showcase example images and update Showcase page
echo.
echo - Add 12 showcase example images ^(showcase-1 to showcase-6, each with 2 images^)
echo - Update Showcase.jsx to use local image paths instead of Unsplash URLs
echo - Add README.md in showcase images directory with naming conventions
echo - Fix image loading error handling to prevent infinite loops
) > "%tempFile%"

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
    )
) else (
    echo [ERROR] Commit failed!
)

pause

