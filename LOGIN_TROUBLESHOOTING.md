# 登录问题排查指南

## 错误信息："Invalid login credentials"

这个错误通常表示以下情况之一：

### 1. 密码错误
- **解决方法**：使用"忘记密码"功能重置密码

### 2. 账号不存在
- **解决方法**：先注册一个新账号

### 3. 邮箱未验证
- **解决方法**：检查邮箱并点击验证链接

---

## 快速解决方案

### 方案1：重置密码（推荐）

1. 在登录页面点击 **"Forgot password?"**（忘记密码？）
2. 输入你的邮箱：`3941906903@qq.com`
3. 点击 **"发送重置邮件"**
4. 检查邮箱（包括垃圾邮件文件夹）
5. 点击邮件中的重置链接
6. 设置新密码
7. 使用新密码登录

### 方案2：检查账号是否存在

在 Supabase Dashboard 中执行以下 SQL：

```sql
-- 检查账号是否存在
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = '3941906903@qq.com';
```

**如果查询没有结果**：
- 说明账号不存在，需要先注册

**如果查询有结果但 `email_confirmed_at` 为 `NULL`**：
- 说明邮箱未验证，需要验证邮箱

### 方案3：验证邮箱

如果账号存在但未验证：

1. 在 Supabase Dashboard → Authentication → Users
2. 找到你的用户
3. 点击用户，查看详情
4. 如果 `Email Confirmed` 为 `false`，可以：
   - 手动设置为已验证（在 Supabase Dashboard 中）
   - 或重新发送验证邮件

### 方案4：在 Supabase 中手动验证邮箱

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 手动验证邮箱（如果账号存在）
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = '3941906903@qq.com'
AND email_confirmed_at IS NULL;
```

### 方案5：重置密码（通过 Supabase）

如果忘记密码，可以在 Supabase Dashboard 中重置：

1. 进入 **Authentication** → **Users**
2. 找到你的用户（邮箱：`3941906903@qq.com`）
3. 点击用户进入详情
4. 点击 **"Reset Password"** 按钮
5. 系统会发送重置邮件到你的邮箱

---

## 检查 Supabase 配置

### 1. 检查邮箱验证设置

在 Supabase Dashboard：
1. 进入 **Authentication** → **Settings**
2. 查看 **"Enable email confirmations"** 设置
3. 如果启用了，新注册的用户必须验证邮箱才能登录

### 2. 检查邮箱提供商设置

确保 Supabase 的邮件服务已正确配置：
1. 进入 **Authentication** → **Settings** → **SMTP Settings**
2. 确认 SMTP 配置正确（如果使用自定义 SMTP）

---

## 创建新账号（如果账号不存在）

如果账号不存在，可以：

1. **通过网站注册**：
   - 在登录页面点击 **"Register"**
   - 填写用户名、邮箱、密码
   - 完成注册后，检查邮箱并点击验证链接

2. **通过 SQL 创建**（不推荐，仅用于测试）：
```sql
-- 注意：这不会设置密码，需要通过重置密码功能设置
-- 建议使用网站注册功能
```

---

## 常见问题

### Q: 为什么注册后无法登录？
A: 可能是因为：
- 邮箱未验证（检查邮箱并点击验证链接）
- 密码输入错误
- 账号创建失败

### Q: 如何禁用邮箱验证？
A: 在 Supabase Dashboard：
1. **Authentication** → **Settings**
2. 关闭 **"Enable email confirmations"**
3. 保存设置

**注意**：禁用邮箱验证会降低安全性，不推荐在生产环境使用。

### Q: 重置密码邮件收不到？
A: 检查：
1. 垃圾邮件文件夹
2. Supabase 的邮件发送限制
3. 邮箱地址是否正确
4. Supabase 的 SMTP 配置

### Q: 可以手动设置密码吗？
A: 可以，但需要通过 Supabase Dashboard：
1. 进入 **Authentication** → **Users**
2. 找到用户
3. 点击 **"Reset Password"** 发送重置邮件
4. 或使用 Supabase 的 Admin API（需要服务端密钥）

---

## 测试步骤

1. **检查账号是否存在**：
```sql
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = '3941906903@qq.com';
```

2. **如果存在但未验证，验证邮箱**：
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = '3941906903@qq.com';
```

3. **如果不存在，注册新账号**：
   - 使用网站的注册功能

4. **如果忘记密码，重置密码**：
   - 使用"忘记密码"功能

---

## 联系支持

如果以上方法都无法解决问题，请检查：
1. Supabase 项目是否正常运行
2. 网络连接是否正常
3. 浏览器控制台是否有错误信息
4. Supabase Dashboard 中是否有错误日志

