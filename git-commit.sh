#!/bin/bash

# Git commit script - Security fix
# This script will commit code, but exclude .env.local and dist/ directory

echo "[INFO] Checking Git status..."
git status

echo ""
echo "[INFO] Adding modified files (excluding .env.local and dist/)..."

# First, ensure .env.local and dist/ are not in staging area
git reset HEAD .env.local 2>/dev/null || true
git reset HEAD dist/ 2>/dev/null || true

# Then add files to commit
git add src/utils/modelAPI.js
git add .gitignore
git add SECURITY_FIX.md
git add COMMIT_GUIDE.md
git add git-commit.sh
git add git-commit.bat

# Ensure .env.local and dist/ won't be committed (double check)
git reset HEAD .env.local 2>/dev/null || true
git reset HEAD dist/ 2>/dev/null || true

echo ""
echo "[SUCCESS] Files added to staging:"
git status --short

echo ""
echo "[INFO] Ready to commit..."
echo "Commit message: Security fix: Remove hardcoded API keys and fix modelAPI.js errors"
echo ""
read -p "Confirm commit? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Security fix: Remove hardcoded API keys and fix modelAPI.js errors

- Remove hardcoded Volcano API key from modelAPI.js
- Fix syntax errors in modelAPI.js (remove duplicate methods)
- Update .gitignore to exclude all .env files
- Add SECURITY_FIX.md with security guidelines"
    
    echo ""
    echo "[SUCCESS] Commit successful!"
    echo ""
    echo "[INFO] Push to remote repository..."
    read -p "Push to remote repository? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push
        echo "[SUCCESS] Push successful!"
    else
        echo "[INFO] Push skipped. You can push later manually: git push"
    fi
else
    echo "[CANCELLED] Commit cancelled"
fi

