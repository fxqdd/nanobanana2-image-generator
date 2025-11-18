# PayPal 支付集成完整指南

## 📋 目录
1. [注册PayPal开发者账号](#1-注册paypal开发者账号)
2. [创建应用获取Client ID](#2-创建应用获取client-id)
3. [安装PayPal SDK](#3-安装paypal-sdk)
4. [代码集成步骤](#4-代码集成步骤)
5. [测试支付流程](#5-测试支付流程)
6. [生产环境配置](#6-生产环境配置)

---

## 1. 注册PayPal开发者账号

### 步骤详解：

1. **访问PayPal开发者网站**
   - 打开浏览器，访问：https://developer.paypal.com
   - 点击右上角的 **"登录"** 或 **"Sign Up"** 按钮

2. **登录或注册账号**
   - 如果你已有PayPal账号：直接点击 **"登录"**，使用你的PayPal账号密码登录
   - 如果没有PayPal账号：
     - 点击 **"注册"** 或 **"Sign Up"**
     - 填写邮箱、密码等信息
     - 完成邮箱验证
     - 或者直接访问 https://www.paypal.com 先注册PayPal账号

3. **进入开发者控制台**
   - 登录后，点击右上角头像
   - 选择 **"Dashboard"** 或 **"控制面板"**
   - 或者直接访问：https://developer.paypal.com/dashboard

---

## 2. 创建应用获取Client ID

### 步骤详解：

1. **创建新应用**
   - 在Dashboard页面，找到左侧菜单栏
   - 点击 **"My Apps & Credentials"** 或 **"我的应用和凭证"**
   - 在页面中找到 **"REST API apps"** 部分
   - 点击 **"Create App"** 或 **"创建应用"** 按钮

2. **填写应用信息**
   - **App Name（应用名称）**：输入你的应用名称，例如：`Nano Banana 2`
   - **Merchant（商家）**：选择你的PayPal商家账号（如果没有，需要先创建商家账号）
   - **App Type（应用类型）**：选择 **"Merchant"**（商家）
   - 点击 **"Create App"** 或 **"创建应用"**

3. **获取Client ID和Secret**
   - 创建成功后，你会看到两个重要的信息：
     - **Client ID（客户端ID）**：类似 `AeA1QIZXiflr1_-...`（这是公开的，可以放在前端）
     - **Client Secret（客户端密钥）**：类似 `ELg...`（这是私密的，只能放在后端）
   - **重要**：点击 **"Show"** 查看并复制 **Client Secret**，这个只显示一次！

4. **保存凭证信息**
   - 将 **Client ID** 和 **Client Secret** 保存到安全的地方
   - 建议创建 `.env` 文件存储（见下方配置）

5. **切换沙箱/生产环境**
   - 在页面顶部，你会看到 **"Sandbox"** 和 **"Live"** 两个标签
   - **Sandbox（沙箱）**：用于测试，使用测试账号
   - **Live（生产）**：用于真实支付，使用真实PayPal账号
   - 开发阶段使用 **Sandbox**，上线后切换到 **Live**

---

## 3. 安装PayPal SDK

### 在项目根目录执行：

```bash
npm install @paypal/react-paypal-js
```

这个包提供了React组件，可以轻松集成PayPal支付按钮。

---

## 4. 代码集成步骤

### 4.1 创建环境变量文件

在项目根目录创建 `.env` 文件（如果还没有）：

```env
# PayPal配置
VITE_PAYPAL_CLIENT_ID=你的沙箱Client_ID
# 生产环境时，使用Live环境的Client ID
```

**注意**：
- `.env` 文件不要提交到Git（已在.gitignore中）
- 开发环境使用Sandbox的Client ID
- 生产环境使用Live的Client ID

### 4.2 更新index.html

移除FastSpring脚本，PayPal SDK会通过npm包自动加载。

### 4.3 创建PayPal支付组件

已创建 `src/components/PayPalButton.jsx` 组件。

### 4.4 更新Pricing.jsx

已将FastSpring支付逻辑替换为PayPal支付。

---

## 5. 测试支付流程

### 5.1 使用PayPal沙箱测试账号

1. **创建测试账号**
   - 在PayPal开发者控制台，点击 **"Sandbox"** 标签
   - 点击左侧菜单 **"Accounts"** 或 **"账号"**
   - 点击 **"Create Account"** 创建测试买家账号和商家账号

2. **测试账号信息**
   - **买家账号**：用于测试支付
   - **商家账号**：用于接收付款
   - PayPal会自动生成测试账号，包括邮箱和密码

3. **测试支付**
   - 在网站点击支付按钮
   - 选择PayPal支付
   - 使用测试买家账号登录
   - 完成支付流程
   - 检查商家账号是否收到付款

### 5.2 测试场景

- ✅ 成功支付
- ✅ 取消支付
- ✅ 支付失败
- ✅ 不同金额的支付
- ✅ 月付/年付切换

---

## 6. 生产环境配置

### 6.1 切换到Live环境

1. **获取生产环境Client ID**
   - 在PayPal开发者控制台，点击 **"Live"** 标签
   - 创建新的应用（或使用现有应用）
   - 复制 **Client ID**

2. **更新环境变量**
   - 在生产服务器上设置环境变量：
     ```env
     VITE_PAYPAL_CLIENT_ID=你的生产环境Client_ID
     ```

3. **验证配置**
   - 确保使用Live环境的Client ID
   - 测试真实支付流程（小额测试）

### 6.2 后端集成（可选，用于更安全的支付验证）

如果需要更安全的支付验证，可以创建后端API：

1. **创建支付订单**
   - 后端调用PayPal API创建订单
   - 返回订单ID给前端

2. **验证支付结果**
   - 前端支付完成后，通知后端
   - 后端验证支付状态
   - 更新用户订阅状态

### 6.3 支付回调处理

PayPal支付完成后，可以通过以下方式处理：

1. **前端回调**
   - 使用PayPal SDK的 `onApprove` 回调
   - 在回调中更新用户状态

2. **Webhook（推荐）**
   - 在PayPal控制台配置Webhook URL
   - PayPal会向你的服务器发送支付通知
   - 服务器验证并处理支付结果

---

## 7. 常见问题

### Q1: Client ID在哪里找到？
**A**: PayPal开发者控制台 → My Apps & Credentials → 你的应用 → Client ID

### Q2: 沙箱和生产环境的Client ID一样吗？
**A**: 不一样，需要分别创建。开发用Sandbox，生产用Live。

### Q3: 支付成功后如何更新用户订阅？
**A**: 在 `onApprove` 回调中调用你的后端API，更新数据库中的用户订阅状态。

### Q4: 如何测试支付？
**A**: 使用PayPal沙箱测试账号，在Sandbox环境下测试。

### Q5: 支付按钮不显示？
**A**: 检查：
- Client ID是否正确
- 网络连接是否正常
- 浏览器控制台是否有错误
- PayPal SDK是否正确加载

---

## 8. 安全注意事项

1. **永远不要在前端代码中暴露Client Secret**
2. **使用环境变量存储敏感信息**
3. **生产环境使用HTTPS**
4. **验证支付结果（推荐使用Webhook）**
5. **定期检查PayPal开发者控制台的安全设置**

---

## 9. 下一步

完成集成后，你可以：
- ✅ 测试支付流程
- ✅ 配置支付成功后的用户状态更新
- ✅ 设置Webhook处理支付通知
- ✅ 添加支付历史记录功能
- ✅ 实现退款功能（如需要）

---

## 10. 参考资源

- [PayPal开发者文档](https://developer.paypal.com/docs)
- [PayPal JS SDK文档](https://developer.paypal.com/sdk/js/overview/)
- [React PayPal组件文档](https://github.com/paypal/react-paypal-js)
- [PayPal沙箱测试指南](https://developer.paypal.com/docs/api-basics/sandbox/)

---

**需要帮助？** 查看PayPal开发者文档或联系PayPal支持。

