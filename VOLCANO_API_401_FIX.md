# 火山引擎 API 401 错误排查指南

## 🔍 问题分析

从错误日志看，您遇到的是 `401 Unauthorized` 错误，发生在调用 `/api/volcano/chat/completions` 时。这通常表示**认证失败**。

## 📋 可能的原因

### 1. **Cloudflare 环境变量未配置**（最可能）

在生产环境中，Cloudflare Pages Function 需要从环境变量中读取 API 密钥。

**检查步骤：**
1. 登录 Cloudflare Dashboard
2. 进入您的 Pages 项目
3. 进入 **Settings** → **Environment Variables**
4. 检查是否存在以下环境变量：
   - `VOLCANO_API_KEY` 或 `VITE_VOLCANO_API_KEY`

**解决方案：**
如果不存在，请添加：
- **Variable name**: `VOLCANO_API_KEY`
- **Value**: 您的火山引擎 API 密钥
- **Environment**: 选择 `Production`（如果需要，也可以添加到 `Preview`）

### 2. **API 密钥格式问题**

火山引擎 API 可能需要特定的认证格式。

**检查代码中的认证方式：**
查看 `functions/api/volcano/chat/completions.js`，当前使用的是：
```javascript
'Authorization': `Bearer ${requestApiKey}`
```

**可能的解决方案：**
火山引擎 API 可能需要使用 `X-Volcano-API-Key` 头而不是 `Authorization: Bearer`。

### 3. **API 密钥无效或已过期**

- 检查您的火山引擎 API 密钥是否有效
- 确认密钥是否有权限访问 `doubao-seed-1-6-251015` 模型
- 检查密钥是否已过期

### 4. **请求头传递问题**

在生产环境中，前端通过 `x-volcano-api-key` 头传递密钥，但 Cloudflare Function 可能没有正确读取。

## 🔧 修复步骤

### 步骤 1：检查 Cloudflare 环境变量

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择您的 Pages 项目
3. 进入 **Settings** → **Environment Variables**
4. 确认 `VOLCANO_API_KEY` 已配置且值正确

### 步骤 2：验证 API 密钥

在火山引擎控制台检查：
- API 密钥是否有效
- 是否有调用 `doubao-seed-1-6-251015` 模型的权限
- 配额是否充足

### 步骤 3：检查认证方式

根据火山引擎 API 文档，确认正确的认证方式。可能需要修改 `functions/api/volcano/chat/completions.js`：

**当前代码（第 64 行）：**
```javascript
'Authorization': `Bearer ${requestApiKey}`
```

**可能需要改为：**
```javascript
'X-Volcano-API-Key': requestApiKey
```

或者同时使用两种方式：
```javascript
'Authorization': `Bearer ${requestApiKey}`,
'X-Volcano-API-Key': requestApiKey
```

### 步骤 4：查看 Cloudflare 日志

1. 进入 Cloudflare Dashboard
2. 选择您的 Pages 项目
3. 进入 **Functions** → **Logs**
4. 查看最近的错误日志，确认：
   - API 密钥是否正确传递
   - 请求是否到达火山引擎服务器
   - 返回的具体错误信息

## 🧪 测试步骤

### 本地测试

1. 确保 `.env.local` 中有：
   ```env
   VITE_VOLCANO_API_KEY=你的API密钥
   VITE_DOUBAO_SEED_API_KEY=你的API密钥（可选，默认使用上面的）
   ```

2. 重启开发服务器：
   ```bash
   npm run dev
   ```

3. 测试提示词优化功能

### 生产环境测试

1. 确认 Cloudflare 环境变量已配置
2. 重新部署（如果需要）
3. 测试提示词优化功能
4. 查看浏览器控制台和 Cloudflare 日志

## 📝 快速检查清单

- [ ] Cloudflare 环境变量 `VOLCANO_API_KEY` 已配置
- [ ] API 密钥值正确（无多余空格）
- [ ] API 密钥有效且未过期
- [ ] API 密钥有权限访问 `doubao-seed-1-6-251015` 模型
- [ ] 本地 `.env.local` 文件配置正确
- [ ] 开发环境可以正常调用（如果本地也失败，问题在 API 密钥本身）

## 🔗 相关文件

- `functions/api/volcano/chat/completions.js` - Cloudflare Function 代理
- `src/utils/modelAPI.js` - 前端 API 调用逻辑
- `.env.local` - 本地环境变量（开发环境）

## 💡 常见问题

**Q: 为什么开发环境正常，生产环境报 401？**
A: 开发环境使用 `.env.local`，生产环境使用 Cloudflare 环境变量。请检查 Cloudflare 环境变量是否配置。

**Q: 如何确认 API 密钥是否正确传递？**
A: 查看 Cloudflare Functions 日志，检查 `hasApiKey` 是否为 `true`，以及 `requestApiKey` 的值。

**Q: 火山引擎 API 需要什么认证格式？**
A: 请查阅火山引擎官方文档，确认是使用 `Authorization: Bearer` 还是 `X-Volcano-API-Key` 头。

---

如果以上步骤都无法解决问题，请：
1. 查看 Cloudflare Functions 的详细错误日志
2. 检查火山引擎 API 文档中的认证要求
3. 联系火山引擎技术支持确认 API 密钥状态

