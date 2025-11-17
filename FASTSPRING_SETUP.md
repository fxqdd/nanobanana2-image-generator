# FastSpring 支付集成配置说明

## 问题排查

### 1. 订阅按钮没有反应

如果点击订阅按钮没有反应，请按以下步骤排查：

1. **打开浏览器开发者工具（F12）**，查看控制台（Console）是否有错误信息
2. **检查 FastSpring 脚本是否加载**：
   - 在控制台中输入 `window.fastspring`，应该能看到 FastSpring 对象
   - 如果显示 `undefined`，说明脚本未加载成功

3. **常见原因**：
   - 域名未添加到 FastSpring 白名单（见下方配置说明）
   - 网络问题导致脚本加载失败
   - 浏览器阻止了第三方脚本

### 2. 域名白名单配置

在 FastSpring 后台的 "Allow Listed Website Domains" 对话框中，需要填写允许加载支付弹窗的域名。

#### 填写格式

每行一个域名，只填写协议 + 域名，**不要包含完整 URL**。

#### 需要填写的域名

根据您的网站配置，需要填写以下域名：

**生产环境：**
```
https://nanobanana2.online
```

**开发/测试环境：**
```
http://localhost:5173
http://127.0.0.1:5173
```

**如果有其他域名或子域名，也需要添加：**
```
https://www.nanobanana2.online
https://nanobanana.ai
```

#### 填写示例

在 FastSpring 后台的文本框中，应该这样填写：

```
https://nanobanana2.online
http://localhost:5173
http://127.0.0.1:5173
```

#### 重要提示

⚠️ **域名更新后需要等待 15-20 分钟才能生效**

- 保存后，FastSpring 需要时间同步配置
- 在这期间，支付功能可能无法正常工作
- 建议在测试环境先验证配置正确后再切换到生产环境

## 产品路径配置

代码中使用的产品路径需要在 FastSpring 后台配置对应的产品：

- `basic-monthly` - Basic 计划月付
- `basic-yearly` - Basic 计划年付
- `professional-monthly` - Professional 计划月付
- `professional-yearly` - Professional 计划年付
- `master-monthly` - Master 计划月付
- `master-yearly` - Master 计划年付

如果您的 FastSpring 产品路径不同，请修改 `src/pages/Pricing.jsx` 中的 `productPathMonthly` 和 `productPathYearly` 字段。

## 测试步骤

1. **配置域名白名单**（等待 15-20 分钟生效）
2. **打开浏览器开发者工具（F12）**
3. **访问定价页面**
4. **查看控制台**，应该能看到：
   - `✓ FastSpring 脚本标签已找到`
   - `✓ FastSpring 脚本已加载`
   - `✓ FastSpring API 已就绪`
5. **点击订阅按钮**，应该能弹出 FastSpring 支付窗口
6. **查看控制台日志**，确认支付流程正常

## 常见错误

### 错误：支付系统未就绪
- **原因**：FastSpring API 未加载
- **解决**：检查脚本是否正常加载，域名是否在白名单中

### 错误：产品配置错误
- **原因**：产品路径未在 FastSpring 后台配置
- **解决**：在 FastSpring 后台创建对应的产品，路径要与代码中的一致

### 错误：域名未授权
- **原因**：当前域名未添加到白名单
- **解决**：在 FastSpring 后台添加当前域名，等待 15-20 分钟生效

## 技术支持

如果问题持续存在，请：
1. 检查浏览器控制台的完整错误信息
2. 确认 FastSpring 后台配置是否正确
3. 联系 FastSpring 技术支持或查看官方文档

