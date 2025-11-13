# Resend + Supabase 邮件配置完整指南

## 方式一：通过 Resend API 绕过 Supabase SMTP（当前实现）

> 最新方案：我们已经在 Cloudflare Pages Functions 中新增 `functions/api/send-signup-email.js`，使用 Resend 直接发送验证邮件。因此 Supabase 不再需要自定义 SMTP，避免 `config reloader` 报错。

### 注册流程改造

- 前端注册不再调用 `supabase.auth.signUp`，而是请求新的 `functions/api/register-user.js`。
- `register-user` 会用 Service Role 调用 `supabase.auth.admin.createUser` 创建账号（不会触发官方确认邮件）。
- 创建成功后，复用 `send-signup-email` 生成动作链接并通过 Resend 发送品牌化邮件。
- 后续用户点击邮件确认后，就能正常登录；Supabase 控制台只会显示 Resend 发出的邮件记录。

### 需要的 Cloudflare 环境变量

| 变量名 | 说明 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目的 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（谨慎保密，仅在服务端使用） |
| `RESEND_API_KEY` | Resend API Key（Sending access） |
| `RESEND_FROM_EMAIL` | 发件邮箱，推荐 `onboarding@resend.dev` 或已在 Resend 验证的域名邮箱 |
| `RESEND_FROM_NAME` | （可选）发件人名称，默认 `Nano Banana 2` |
| `PUBLIC_SITE_URL` | （可选）站点根地址，默认使用当前域名生成 `/login` 重定向 |

### 工作流程

1. 前端注册成功后调用 `/api/send-signup-email`。
2. Cloudflare Function 使用 Service Role 生成 Supabase 验证链接。
3. 通过 Resend API 发送 HTML 验证邮件给用户。
4. “重新发送邮件”按钮同样调用此函数。
5. “忘记密码”面板会调用同一个函数（`type: recovery`），发送 Resend 样式的密码重置邮件。

### 验证步骤

1. 关闭 Supabase `Project Settings → Auth → Emails` 中的自定义 SMTP。
2. 确认 Cloudflare Pages 已配置环境变量并重新部署。
3. 注册新账号 → Network 面板可看到 `/api/register-user` 和 `/api/send-signup-email` 200。
4. Resend Dashboard → Logs 能看到唯一一封确认邮件（不再有 Supabase 默认邮件）。
5. 邮箱收到 Resend 邮件，点击链接后 Supabase `email_confirmed_at` 更新为时间戳。
6. 通过“忘记密码”发送的邮件会生成 Supabase Recovery Link，同样由 Resend 送达。

---

## 方式二：使用 Resend Supabase Integration（旧方案）

### 步骤 1：点击集成按钮
1. 在 Resend Dashboard → Settings → Integrations
2. 找到 "Supabase Integration"
3. 点击 "Go to integration" 按钮
4. 按照向导完成授权和配置

### 步骤 2：验证配置
配置完成后，检查 Supabase Dashboard：
- Project Settings → Auth → SMTP Settings
- 确认所有字段已自动填充

---

## 方式三：手动配置 SMTP（如果仍想使用 Supabase 自带流程）

### 第一步：获取 Resend API Key

1. 登录 Resend Dashboard
2. 左侧菜单 → **API Keys**
3. 点击 **"Create API Key"**
4. 填写信息：
   - **Name**: `Supabase SMTP`
   - **Permission**: 选择 **"Sending access"**
5. 点击 **"Add"**
6. **重要**：复制生成的 API Key（只显示一次，请保存好）

### 第二步：准备发件人邮箱

**选项 A：使用 Resend 测试邮箱（最简单，推荐测试用）**
```
onboarding@resend.dev
```
- ✅ 无需验证，可直接使用
- ✅ 适合测试和开发环境

**选项 B：使用自己的邮箱（需要验证）**
1. Resend Dashboard → **Domains**
2. 点击 **"Add Domain"** 添加你的域名
3. 按照指引添加 DNS 记录验证域名
4. 验证后可以使用 `noreply@yourdomain.com` 等邮箱

### 第三步：在 Supabase 中配置 SMTP

1. 登录 **Supabase Dashboard**
2. 进入 **Project Settings** → **Auth** → **SMTP Settings**
3. 填写以下信息：

#### 发件人详情 (Sender Details)

- **发件人电子邮件地址 (Sender Email Address)**:
  ```
  onboarding@resend.dev
  ```
  （或你验证过的邮箱）

- **发件人姓名 (Sender Name)**:
  ```
  Nano Banana 2
  ```

#### SMTP 提供商设置 (SMTP Provider Settings)

- **Host (主持人)**:
  ```
  smtp.resend.com
  ```

- **Port (端口号)**:
  ```
  587
  ```

- **Username (用户名)**:
  ```
  resend
  ```
  （固定值，必须是小写）

- **Password (密码)**:
  ```
  你刚才在 Resend 中创建的 API Key
  ```
  （粘贴完整的 API Key，不是邮箱密码）

### 第四步：启用并保存

1. ✅ 确保 **"Enable custom SMTP"** 开关是**打开**的（绿色）
2. 点击 **"Save"** 保存配置
3. 等待几秒钟让配置生效

### 第五步：验证配置

1. 回到注册页面，尝试注册新用户
2. 检查 **Supabase Logs** → **Auth** 集合：
   - 应该看到 `mail_from`、`mail_to`、`mail_type` 有值（不再是 null）
3. 检查 **Resend Dashboard** → **Logs**：
   - 应该能看到邮件发送记录
4. 检查邮箱（包括垃圾邮件文件夹）

---

## 配置检查清单

- [ ] Resend API Key 已创建（Sending access 权限）
- [ ] Supabase SMTP Settings 中所有字段已填写：
  - [ ] 发件人电子邮件地址
  - [ ] 发件人姓名
  - [ ] Host: `smtp.resend.com`
  - [ ] Port: `587`
  - [ ] Username: `resend`（小写）
  - [ ] Password: Resend API Key
- [ ] "Enable custom SMTP" 开关已打开
- [ ] 配置已保存
- [ ] Supabase Logs 中 `mail_from`、`mail_to` 不再是 null
- [ ] Resend Logs 中有邮件发送记录

---

## 常见问题

### Q: Integration 按钮是灰色的，点不了？
A: 可能需要先完成某些前置步骤，或者直接使用手动配置方式。

### Q: 配置后还是 `mail_from: null`？
A: 检查：
1. "Enable custom SMTP" 开关是否打开
2. 所有字段是否都已填写（没有留空）
3. Username 是否是小写的 `resend`
4. Password 是否是完整的 API Key（不是邮箱密码）

### Q: Resend API Key 在哪里找？
A: Resend Dashboard → API Keys → 创建新的或查看现有的

### Q: 可以测试发送吗？
A: 配置完成后，在注册页面尝试注册新用户，然后检查：
- Supabase Logs（应该看到邮件发送记录）
- Resend Logs（应该看到邮件发送记录）
- 邮箱（包括垃圾邮件文件夹）

---

## 如果还是不行

1. **检查 Supabase Logs**：
   - Logs → Auth 集合
   - 查看是否有错误信息

2. **检查 Resend Logs**：
   - Resend Dashboard → Logs
   - 查看是否有发送记录或错误

3. **验证 API Key**：
   - 确保 API Key 有 "Sending access" 权限
   - 确保 API Key 未过期

4. **临时解决方案**：
   - 如果只是测试，可以临时禁用邮件确认：
   - Supabase → Authentication → Settings → 关闭 "Enable email confirmations"
   - 这样注册后会直接登录，无需邮件确认

