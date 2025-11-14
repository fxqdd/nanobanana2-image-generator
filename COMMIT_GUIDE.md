# Git 提交指南

## 快速提交（推荐）

### Windows 用户
双击运行 `git-commit.bat` 文件

### Linux/Mac 用户
```bash
chmod +x git-commit.sh
./git-commit.sh
```

## 手动提交步骤

### 1. 检查当前状态
```bash
git status
```

### 2. 添加要提交的文件（排除 .env.local 和 dist/）
```bash
git add src/utils/modelAPI.js
git add .gitignore
git add SECURITY_FIX.md
git add COMMIT_GUIDE.md
git add git-commit.sh
git add git-commit.bat
```

### 3. 确认不会提交敏感文件
```bash
# 检查暂存区，确保 .env.local 和 dist/ 不在其中
git status --short

# 如果看到 .env.local 或 dist/，执行以下命令移除：
git reset HEAD .env.local
git reset HEAD dist/
```

### 4. 提交更改
```bash
git commit -m "Security fix: Remove hardcoded API keys and fix modelAPI.js errors

- Remove hardcoded Volcano API key from modelAPI.js
- Fix syntax errors in modelAPI.js (remove duplicate methods)
- Update .gitignore to exclude all .env files
- Add SECURITY_FIX.md with security guidelines"
```

### 5. 推送到远程仓库
```bash
git push
```

## 验证提交内容

提交前，可以运行以下命令确认：

```bash
# 查看将要提交的文件
git diff --cached --name-only

# 确认 .env.local 不在列表中
git diff --cached --name-only | grep -E "\.env|dist/"
# 如果上面的命令没有输出，说明安全 ✅
```

## 注意事项

- ✅ `.env.local` 文件不会被提交（已在 .gitignore 中）
- ✅ `dist/` 目录不会被提交（已在 .gitignore 中）
- ✅ 所有 API Keys 现在都通过环境变量配置
- ⚠️ 如果之前已经提交过敏感信息，需要轮换所有 API Keys

