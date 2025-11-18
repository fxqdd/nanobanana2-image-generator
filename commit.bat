   @echo off
   setlocal enabledelayedexpansion
   chcp 65001 >nul 2>&1

   echo ========================================
   echo  Git Commit Helper
   echo ========================================
   echo.

   git rev-parse --git-dir >nul 2>&1
   if errorlevel 1 (
     echo [ERROR] This is not a git repository. Run inside project root.
     pause
     exit /b 1
   )

   echo Working tree status:
   git status --short
   echo.

   set /p addAll="Run git add -A ? (y/n, default n): "
   if /i "!addAll!"=="y" (
     git add -A
     git reset HEAD dist/ >nul 2>&1
     git reset HEAD node_modules/ >nul 2>&1
     git reset HEAD .env >nul 2>&1
     git reset HEAD ".env.*" >nul 2>&1
   )

   echo.
   echo Staged files:
   git diff --cached --name-status
   echo.

   git diff --cached --quiet >nul 2>&1
   if not errorlevel 1 (
     echo [WARN] Nothing staged. Please run git add first.
     pause
     exit /b 0
   )

   set "commitMsg="
   set /p commitMsg="Commit message (default: chore: update project): "
   if "!commitMsg!"=="" set "commitMsg=chore: update project"

   echo Commit message: "!commitMsg!"
   set /p confirm="Confirm commit & push? (y/n): "
   if /i not "!confirm!"=="y" (
     echo [CANCELLED]
     pause
     exit /b 0
   )

   git commit -m "!commitMsg!"
   if errorlevel 1 (
     echo [ERROR] git commit failed.
     pause
     exit /b 1
   )

   git push
   if errorlevel 1 (
     echo [ERROR] git push failed.
   ) else (
     echo [SUCCESS] Commit and push completed.
   )

   echo.
   pause