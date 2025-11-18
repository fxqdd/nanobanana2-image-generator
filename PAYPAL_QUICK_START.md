# PayPal 支付快速开始指南

## 🚀 5分钟快速集成

### 第一步：获取PayPal Client ID（2分钟）

1. **访问PayPal开发者网站**
   - 打开：https://developer.paypal.com
   - 点击右上角 **"登录"** 按钮

2. **登录PayPal账号**
   - 使用你的PayPal账号登录（如果没有，先注册：https://www.paypal.com）

3. **进入控制台**
   - 登录后，点击右上角头像 → 选择 **"Dashboard"**
   - 或直接访问：https://developer.paypal.com/dashboard

4. **创建应用**
   - 在左侧菜单点击 **"My Apps & Credentials"**（我的应用和凭证）
   - 找到 **"REST API apps"** 部分
   - 点击 **"Create App"**（创建应用）按钮

5. **填写应用信息**
   - **App Name**: 输入 `Nano Banana 2`（或任意名称）
   - **Merchant**: 选择你的PayPal商家账号
   - **App Type**: 选择 **"Merchant"**
   - 点击 **"Create App"**

6. **复制Client ID**
   - 创建成功后，你会看到 **"Client ID"**
   - 点击 **"Show"** 查看 **"Client Secret"**（暂时不需要，但建议保存）
   - **复制Client ID**（类似：`AeA1QIZXiflr1_-...`）

### 第二步：配置环境变量（1分钟）

1. **创建.env文件**
   - 在项目根目录创建 `.env` 文件
   - 如果已有 `.env` 文件，直接编辑

2. **添加PayPal配置**
   ```env
   VITE_PAYPAL_CLIENT_ID=你的Client_ID_粘贴在这里
   ```

   **示例**：
   ```env
   VITE_PAYPAL_CLIENT_ID=AeA1QIZXiflr1_-abc123xyz
   ```

3. **保存文件**

### 第三步：测试支付（2分钟）

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问定价页面**
   - 打开浏览器访问：http://localhost:5173/pricing
   - 或你配置的本地地址

3. **测试支付**
   - 点击任意计划的支付按钮
   - 会弹出PayPal支付窗口
   - 使用PayPal沙箱测试账号登录（如果没有，在PayPal开发者控制台创建）

4. **创建测试账号**（如果需要）
   - 在PayPal开发者控制台，点击 **"Sandbox"** 标签
   - 点击左侧 **"Accounts"** → **"Create Account"**
   - PayPal会自动生成测试买家账号和密码

### ✅ 完成！

现在你的网站已经集成了PayPal支付功能！

---

## 📝 重要提示

### 开发环境 vs 生产环境

- **开发/测试**：使用 **Sandbox** 环境的Client ID
- **生产环境**：使用 **Live** 环境的Client ID

切换方法：
1. 在PayPal开发者控制台，点击顶部的 **"Sandbox"** 或 **"Live"** 标签
2. 在对应环境下创建应用并获取Client ID
3. 更新 `.env` 文件中的 `VITE_PAYPAL_CLIENT_ID`

### 支付成功后的处理

目前支付成功后会显示提示消息。如果需要更新用户订阅状态，需要：

1. **创建后端API**（推荐）
   - 在 `handlePayPalSuccess` 函数中调用你的后端API
   - 后端验证支付并更新数据库

2. **或使用PayPal Webhook**
   - 在PayPal控制台配置Webhook URL
   - PayPal会自动通知你的服务器支付结果

详细说明请查看 `PAYPAL_INTEGRATION_GUIDE.md`

---

## 🐛 常见问题

### Q: 支付按钮不显示？
**A**: 检查：
1. `.env` 文件中的 `VITE_PAYPAL_CLIENT_ID` 是否正确
2. 重启开发服务器（`npm run dev`）
3. 浏览器控制台是否有错误信息

### Q: 如何切换到生产环境？
**A**: 
1. 在PayPal控制台切换到 **"Live"** 标签
2. 创建新应用获取Live环境的Client ID
3. 更新 `.env` 文件

### Q: 支付成功后如何更新用户状态？
**A**: 在 `src/pages/Pricing.jsx` 的 `handlePayPalSuccess` 函数中添加你的API调用代码。

---

## 📚 更多信息

- 详细集成指南：`PAYPAL_INTEGRATION_GUIDE.md`
- PayPal官方文档：https://developer.paypal.com/docs
- React PayPal组件：https://github.com/paypal/react-paypal-js

