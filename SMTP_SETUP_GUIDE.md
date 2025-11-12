# Supabase SMTP 配置指南

## 方案一：使用 Mailgun（推荐，免费且稳定）

Mailgun 提供免费计划：每月 5,000 封邮件，前 3 个月每月 100,000 封。

### 第一步：注册 Mailgun 账号

1. 访问 https://www.mailgun.com
2. 点击 "Sign Up" 注册账号
3. 选择免费计划（Free Plan）
4. 验证你的邮箱地址和手机号（需要接收验证码）
5. 完成账号设置

### 第二步：获取 SMTP 凭据

1. 登录 Mailgun Dashboard
2. 左侧菜单 → Sending → Domain Settings
3. 如果你有自定义域名，可以添加并验证
4. 如果没有域名，可以使用 Mailgun 提供的沙盒域名（Sandbox Domain）
5. 点击你的域名（或沙盒域名）
6. 找到 **SMTP credentials** 部分
7. 点击 "Reset Password" 或查看现有的 SMTP 信息
8. **重要**：记录以下信息：
   - **SMTP Hostname**: `smtp.mailgun.org`
   - **Port**: `587` 或 `465`
   - **Username**: 通常是 `postmaster@your-domain.mailgun.org` 或类似格式
   - **Password**: 点击 "Reset Password" 后显示的密码（只显示一次，请保存好）

### 第三步：验证发件人邮箱（如果使用沙盒域名）

如果使用 Mailgun 的沙盒域名：
1. Mailgun Dashboard → Sending → Authorized Recipients
2. 添加你的邮箱地址
3. Mailgun 会发送验证邮件，点击邮件中的链接完成验证
4. **注意**：沙盒域名只能发送到已验证的收件人邮箱

如果使用自己的域名：
1. 按照 Mailgun 的指引添加 DNS 记录
2. 验证域名后，可以发送到任何邮箱

### 第四步：在 Supabase 中配置 SMTP

在 Supabase Dashboard → Project Settings → Auth → SMTP Settings 中填写：

#### 发件人详情 (Sender Details)

- **发件人电子邮件地址 (Sender Email Address)**:
  ```
  你的邮箱地址（如果使用沙盒域名，必须是已验证的收件人）
  例如: noreply@yourdomain.com 或 your-email@gmail.com
  ```

- **发件人姓名 (Sender Name)**:
  ```
  你的名字或公司名
  例如: Nano Banana 2
  ```

#### SMTP 提供商设置 (SMTP Provider Settings)

- **主持人 (Host)**:
  ```
  smtp.mailgun.org
  ```

- **端口号 (Port Number)**:
  ```
  587
  ```
  （推荐使用 587，如果不行可以尝试 465）

- **用户名 (Username)**:
  ```
  你在 Mailgun 中看到的 SMTP Username
  通常是: postmaster@your-domain.mailgun.org
  ```

- **密码 (Password)**:
  ```
  你在 Mailgun 中重置的 SMTP Password
  ```
  （粘贴完整的密码）

### 第五步：保存并测试

1. 填写完所有字段后，点击保存
2. 确保 "启用自定义 SMTP" 开关是打开的（绿色）
3. 回到注册页面，尝试重新注册或重新发送验证邮件
4. 检查邮箱（包括垃圾邮件文件夹）

---

## 方案二：使用 Resend（推荐，开发者友好）

Resend 专门为开发者设计，配置简单，免费计划每月 3,000 封邮件。

### 第一步：注册 Resend 账号

1. 访问 https://resend.com
2. 点击 "Get Started" 注册账号
3. 验证你的邮箱地址
4. 完成账号设置

### 第二步：获取 API Key

1. 登录 Resend Dashboard
2. 左侧菜单 → API Keys
3. 点击 "Create API Key"
4. 填写信息：
   - **Name**: `Supabase SMTP`（任意名称）
   - **Permission**: 选择 "Sending access"
5. 点击 "Add"
6. **重要**：复制生成的 API Key（只显示一次，请保存好）

### 第三步：添加域名（可选）

1. Resend Dashboard → Domains
2. 点击 "Add Domain" 添加你的域名
3. 按照指引添加 DNS 记录验证域名
4. 如果只是测试，可以跳过这一步，使用 Resend 的默认发件人

### 第四步：在 Supabase 中配置 SMTP

在 Supabase Dashboard → Project Settings → Auth → SMTP Settings 中填写：

#### 发件人详情 (Sender Details)

- **发件人电子邮件地址 (Sender Email Address)**:
  ```
  推荐使用 Resend 的测试邮箱（无需验证，可直接使用）：
  onboarding@resend.dev
  
  或者使用你自己的邮箱（需要在 Resend 中验证）：
  your-email@gmail.com 或 noreply@yourdomain.com
  
  ⚠️ 重要：这个邮箱不需要和 Resend 注册邮箱一致！
  ⚠️ 如果使用自己的邮箱，需要在 Resend Dashboard → Domains 中验证
  ```

- **发件人姓名 (Sender Name)**:
  ```
  Nano Banana 2
  ```

#### SMTP 提供商设置 (SMTP Provider Settings)

- **主持人 (Host)**:
  ```
  smtp.resend.com
  ```

- **端口号 (Port Number)**:
  ```
  587
  ```

- **用户名 (Username)**:
  ```
  resend
  ```
  （固定值）

- **密码 (Password)**:
  ```
  你刚才在 Resend 中创建的 API Key
  ```
  （粘贴完整的 API Key）

---

## 方案三：使用 Brevo（原 Sendinblue）

Brevo 提供免费计划：每天 300 封邮件。

### 第一步：注册 Brevo 账号

1. 访问 https://www.brevo.com
2. 点击 "Sign up free" 注册账号
3. 验证你的邮箱地址
4. 完成账号设置

### 第二步：获取 SMTP 凭据

1. 登录 Brevo Dashboard
2. 右上角头像 → Settings → SMTP & API
3. 找到 **SMTP** 部分
4. 点击 "Generate a new SMTP key"
5. **重要**：记录以下信息：
   - **SMTP Server**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Login**: 你的 Brevo 登录邮箱
   - **Password**: 刚才生成的 SMTP Key（只显示一次，请保存好）

### 第三步：在 Supabase 中配置 SMTP

在 Supabase Dashboard → Project Settings → Auth → SMTP Settings 中填写：

#### 发件人详情 (Sender Details)

- **发件人电子邮件地址 (Sender Email Address)**:
  ```
  你的邮箱地址（必须在 Brevo 中验证）
  ```

- **发件人姓名 (Sender Name)**:
  ```
  Nano Banana 2
  ```

#### SMTP 提供商设置 (SMTP Provider Settings)

- **主持人 (Host)**:
  ```
  smtp-relay.brevo.com
  ```

- **端口号 (Port Number)**:
  ```
  587
  ```

- **用户名 (Username)**:
  ```
  你的 Brevo 登录邮箱
  ```

- **密码 (Password)**:
  ```
  你刚才生成的 SMTP Key
  ```

---

## 方案四：使用 Gmail（仅测试，不推荐生产环境）

### 第一步：生成 Gmail 应用专用密码

1. 访问 https://myaccount.google.com
2. 左侧菜单 → Security（安全性）
3. 找到 "2-Step Verification"（两步验证），如果未启用，先启用
4. 在 "2-Step Verification" 页面，找到 "App passwords"（应用专用密码）
5. 选择应用：邮件
6. 选择设备：其他（自定义名称）
7. 输入名称：`Supabase SMTP`
8. 点击 "Generate"
9. **重要**：复制生成的 16 位密码（只显示一次，请保存好）

### 第二步：在 Supabase 中配置 SMTP

在 Supabase Dashboard → Project Settings → Auth → SMTP Settings 中填写：

#### 发件人详情 (Sender Details)

- **发件人电子邮件地址 (Sender Email Address)**:
  ```
  你的 Gmail 地址
  例如: your-email@gmail.com
  ```

- **发件人姓名 (Sender Name)**:
  ```
  Nano Banana 2
  ```

#### SMTP 提供商设置 (SMTP Provider Settings)

- **主持人 (Host)**:
  ```
  smtp.gmail.com
  ```

- **端口号 (Port Number)**:
  ```
  587
  ```

- **用户名 (Username)**:
  ```
  你的 Gmail 地址（完整邮箱）
  ```

- **密码 (Password)**:
  ```
  你刚才生成的 16 位应用专用密码
  ```
  （不是你的 Gmail 登录密码）

---

## 常见问题

### Q: 推荐使用哪个 SMTP 服务？
A: 
- **Mailgun**：免费额度大（每月 5,000 封），稳定可靠，推荐用于生产环境
- **Resend**：开发者友好，配置简单，适合快速上手
- **Brevo**：免费计划每天 300 封，适合小型项目
- **Gmail**：仅适合测试，不推荐生产环境

### Q: 端口 465 和 587 有什么区别？
A: 
- 465: SSL/TLS 加密（隐式）
- 587: STARTTLS 加密（推荐，更灵活）

大多数 SMTP 服务推荐使用 587。

### Q: 配置后还是收不到邮件？
A: 检查：
1. 所有字段都已填写（没有占位符）
2. SMTP 服务中的发件人邮箱已通过验证
3. SMTP 凭据（用户名/密码）正确
4. 如果使用沙盒域名（如 Mailgun），收件人邮箱必须已添加到授权列表
5. 检查 Supabase Logs → Auth 集合，查看是否有错误
6. 检查邮箱的垃圾邮件文件夹

### Q: 可以测试 SMTP 配置吗？
A: 配置完成后，在注册页面尝试注册新用户或重新发送验证邮件，然后检查邮箱。

---

## 配置检查清单

### Mailgun 配置检查
- [ ] Mailgun 账号已注册并验证
- [ ] 已获取 SMTP 凭据（Host, Port, Username, Password）
- [ ] 发件人邮箱已验证（如果使用沙盒域名，收件人也要验证）
- [ ] Supabase SMTP 设置中所有字段已填写：
  - [ ] 发件人电子邮件地址
  - [ ] 发件人姓名
  - [ ] Host (smtp.mailgun.org)
  - [ ] Port (587)
  - [ ] Username (SMTP Username)
  - [ ] Password (SMTP Password)
- [ ] "启用自定义 SMTP" 开关已打开
- [ ] 已保存配置
- [ ] 已测试发送邮件

### Resend 配置检查
- [ ] Resend 账号已注册并验证
- [ ] API Key 已创建
- [ ] Supabase SMTP 设置中所有字段已填写：
  - [ ] 发件人电子邮件地址
  - [ ] 发件人姓名
  - [ ] Host (smtp.resend.com)
  - [ ] Port (587)
  - [ ] Username (resend)
  - [ ] Password (API Key)
- [ ] "启用自定义 SMTP" 开关已打开
- [ ] 已保存配置
- [ ] 已测试发送邮件

