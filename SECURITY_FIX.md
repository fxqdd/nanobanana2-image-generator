# 安全修复指南

## 已修复的问题

### 1. 移除硬编码的 API Key
- ✅ 已从 `src/utils/modelAPI.js` 中移除硬编码的火山引擎 API Key
- ✅ 现在强制要求通过环境变量配置

### 2. .gitignore 配置
- ✅ `.env*` 文件已被忽略
- ✅ `dist/` 目录已被忽略

## 需要立即执行的操作

### ⚠️ 重要：轮换所有暴露的 API Keys

由于这些 API Keys 已经在 Git 历史中暴露，**必须立即轮换**：

1. **火山引擎 API Key** (`f16cd787-3581-461d-82fc-8335ae8ef99c`)
   - 登录火山引擎控制台
   - 删除或禁用旧的 API Key
   - 创建新的 API Key
   - 更新 `.env.local` 文件

2. **Google API Key** (如果已暴露)
   - 登录 Google Cloud Console
   - 删除或限制旧的 API Key
   - 创建新的 API Key
   - 更新 `.env.local` 文件

3. **OpenRouter API Key** (如果已暴露)
   - 登录 OpenRouter Dashboard
   - 删除旧的 API Key
   - 创建新的 API Key
   - 更新 `.env.local` 文件

4. **Resend API Key** (如果已暴露)
   - 登录 Resend Dashboard
   - 删除旧的 API Key
   - 创建新的 API Key
   - 更新 Cloudflare Pages 环境变量

5. **Supabase Service Role Key** (如果已暴露)
   - 登录 Supabase Dashboard
   - 重置 Service Role Key
   - 更新 Cloudflare Pages 环境变量

### 清理 Git 历史（可选但推荐）

如果你想从 Git 历史中完全删除敏感信息：

```bash
# 警告：这会重写 Git 历史，需要强制推送
# 确保团队成员都了解这个操作

# 使用 git-filter-repo (推荐)
git filter-repo --path src/utils/modelAPI.js --invert-paths --force

# 或者使用 BFG Repo-Cleaner
# 下载 BFG: https://rtyley.github.io/bfg-repo-cleaner/
bfg --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送（危险操作）
git push origin --force --all
```

### 检查已提交的敏感文件

运行以下命令检查是否有敏感信息被提交：

```bash
# 检查是否有 .env 文件被提交
git ls-files | grep -E "\.env"

# 检查 dist/ 目录是否被提交
git ls-files | grep "^dist/"

# 检查是否有硬编码的 API keys
git grep -E "(AIzaSy|sk-|f16cd787|api[_-]?key)" --ignore-case
```

### 如果 dist/ 目录已被提交

```bash
# 从 Git 中删除 dist/ 目录（但保留本地文件）
git rm -r --cached dist/
git commit -m "Remove dist/ directory from git tracking"
git push
```

## 预防措施

### 1. 创建 .env.local 文件（如果还没有）

在项目根目录创建 `.env.local` 文件：

```env
# Gemini API
VITE_GEMINI_API_KEY=你的Gemini_API_Key

# 火山引擎 API
VITE_VOLCANO_API_KEY=你的火山引擎_API_Key

# Doubao-seed-1.6 API (可选，默认使用火山引擎 API Key)
VITE_DOUBAO_SEED_API_KEY=你的Doubao_API_Key

# OpenRouter API
VITE_OPENROUTER_API_KEY=你的OpenRouter_API_Key
```

### 2. 确保 .gitignore 包含

```
node_modules/
dist/
.env*
*.log
.DS_Store
```

### 3. 使用 Git Hooks 防止提交敏感信息

创建 `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# 检查是否有 API keys 被提交
if git diff --cached | grep -E "(AIzaSy|sk-|f16cd787|api[_-]?key.*=.*['\"])" --ignore-case; then
    echo "❌ 错误：检测到可能的 API Key 泄露！"
    echo "请确保所有 API Keys 都通过环境变量配置，不要硬编码在代码中。"
    exit 1
fi
```

### 4. 使用 GitHub Secrets

对于 CI/CD 和部署，使用 GitHub Secrets 存储敏感信息：
- Settings → Secrets and variables → Actions
- 添加所有需要的 API Keys

### 5. 代码审查检查清单

在提交代码前检查：
- [ ] 没有硬编码的 API Keys
- [ ] 没有提交 `.env` 文件
- [ ] 没有提交 `dist/` 目录
- [ ] 文档中没有真实的 API Keys
- [ ] 所有敏感信息都通过环境变量配置

## 监控

建议使用以下工具持续监控：
- **GitGuardian** (你已经在使用)
- **GitHub Advanced Security** (如果可用)
- **TruffleHog** (本地扫描工具)

## 联系支持

如果 API Key 已被滥用：
1. 立即轮换所有 API Keys
2. 检查 API 使用日志，查看是否有异常调用
3. 联系相关服务提供商报告安全问题

