# API 403 权限错误解决方案

## 问题说明

当您看到错误信息 **"新API提供商无权限访问此资源"** 时，这表示API返回了 `403 Forbidden` 状态码。这通常意味着：

1. **API密钥无效或过期**
2. **API密钥没有访问该模型的权限**
3. **模型名称配置不正确**
4. **API端点配置错误**

## 解决步骤

### 1. 检查环境变量配置

确保在 `.env.local` 文件中正确配置了以下环境变量：

```env
# 老张API配置
VITE_NEW_API_PROVIDER_BASE=https://api.laozhang.ai/v1
VITE_NEW_API_PROVIDER_KEY=你的API密钥
VITE_NEW_API_PROVIDER_MODEL=gemini-2.5-flash-image
```

**重要提示：**
- API Base URL 应该是 `https://api.laozhang.ai/v1`（根据老张API文档）
- 不要包含末尾的斜杠
- API密钥应该从老张API官网获取

### 2. 验证API密钥

1. 登录老张API官网：https://laozhang.ai
2. 进入"令牌"或"API Key"页面
3. 确认您的API密钥：
   - 是否有效（未过期）
   - 是否有足够的余额
   - 是否有访问图像生成模型的权限

### 3. 检查模型名称

根据老张API文档，确认模型名称是否正确。常见的图像生成模型名称可能是：
- `gemini-2.5-flash-image`
- `gpt-4o`（如果支持图像生成）
- 或其他老张API支持的模型

**如何确认模型名称：**
1. 查看老张API的模型列表
2. 确认您要使用的模型名称
3. 更新 `.env.local` 中的 `VITE_NEW_API_PROVIDER_MODEL` 值

### 4. 检查API端点

根据老张API文档，API端点应该是：
- **Base URL**: `https://api.laozhang.ai/v1`
- **完整端点**: `https://api.laozhang.ai/v1/chat/completions`

确保 `.env.local` 中的 `VITE_NEW_API_PROVIDER_BASE` 设置为 `https://api.laozhang.ai/v1`

### 5. 使用代理模式（可选）

如果直接调用API遇到CORS问题，可以使用Cloudflare Functions代理：

1. 在Cloudflare Dashboard中设置环境变量：
   - `NEW_API_PROVIDER_BASE=https://api.laozhang.ai/v1`
   - `NEW_API_PROVIDER_KEY=你的API密钥`

2. 确保 `functions/api/new-api-provider/chat/completions.js` 文件存在

3. 代码会自动使用代理模式（在生产环境）

### 6. 调试信息

打开浏览器开发者工具（F12），查看Console标签，您会看到详细的调试信息：

- **📤 新API提供商请求**: 显示请求的端点、模型等信息
- **❌ 403权限不足详情**: 显示详细的错误信息，包括：
  - API Base URL
  - 使用的模型名称
  - API密钥的前缀（用于验证配置）

### 7. 常见问题排查

#### 问题1: API密钥格式错误
**症状**: 403错误，但API密钥已配置
**解决**: 
- 检查API密钥是否包含多余的空格
- 确认API密钥是完整的（没有被截断）
- 尝试重新生成API密钥

#### 问题2: 模型名称不正确
**症状**: 403错误，但API密钥有效
**解决**:
- 查看老张API文档，确认正确的模型名称
- 尝试使用其他模型名称测试
- 联系老张API客服确认模型名称

#### 问题3: API密钥权限不足
**症状**: 403错误，API密钥有效但无法访问模型
**解决**:
- 检查您的API密钥是否有访问图像生成模型的权限
- 确认您的账户是否有足够的余额
- 联系老张API客服升级权限

#### 问题4: API端点配置错误
**症状**: 403错误，但配置看起来正确
**解决**:
- 确认Base URL是 `https://api.laozhang.ai/v1`（不是 `/v1/`）
- 检查是否有代理配置冲突
- 尝试直接调用API测试（使用curl或Postman）

## 测试API配置

您可以使用以下curl命令测试API配置：

```bash
curl https://api.laozhang.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gemini-2.5-flash-image",
    "messages": [
      {"role": "user", "content": "生成一张花的图片"}
    ]
  }'
```

如果这个命令返回403错误，说明问题在API密钥或模型配置上。

## 联系支持

如果以上步骤都无法解决问题，请：

1. 查看浏览器控制台的详细错误信息
2. 截图保存错误信息
3. 联系老张API客服（微信: ghj930213）
4. 提供以下信息：
   - 错误信息截图
   - API密钥前缀（前8位字符）
   - 使用的模型名称
   - API Base URL

## 相关文件

- 环境变量配置: `.env.local`
- API调用代码: `src/utils/modelAPI.js`
- 代理函数: `functions/api/new-api-provider/chat/completions.js`

