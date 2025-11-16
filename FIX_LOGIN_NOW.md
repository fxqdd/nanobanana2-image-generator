# 立即修复登录问题

## 当前状态
✅ 邮箱已验证（email_confirmed_at 有值）
❌ 仍然无法登录（显示 "Invalid login credentials"）

## 最可能的原因：密码错误

"Invalid login credentials" 错误通常表示：
- 密码不正确
- 或者账号被禁用

## 解决方案

### 方案1：重置密码（推荐）

**步骤：**
1. 在登录页面点击 **"忘记密码?"** 链接
2. 输入邮箱：`3941906903@qq.com`
3. 点击 **"发送重置邮件"**
4. **检查邮箱**（包括垃圾邮件文件夹）
5. 点击邮件中的重置链接
6. 设置新密码（至少6个字符）
7. 使用新密码登录

### 方案2：在 Supabase Dashboard 中重置密码

1. 登录 Supabase Dashboard
2. 进入 **Authentication** → **Users**
3. 搜索邮箱：`3941906903@qq.com`
4. 点击用户进入详情页
5. 点击 **"Reset Password"** 按钮
6. 系统会发送重置邮件到你的邮箱
7. 按照邮件中的说明重置密码

### 方案3：检查并修复账号状态

在 Supabase SQL Editor 中执行 `fix_login_issue.sql` 脚本：

这个脚本会：
1. ✅ 检查账号和 profile 状态
2. ✅ 确保邮箱已验证
3. ✅ 创建或更新 profile 记录
4. ✅ 设置管理员权限和无限点数

**执行后，如果仍然无法登录，请使用方案1重置密码。**

---

## 如果重置密码后仍然无法登录

### 检查1：确认密码格式
- 密码至少6个字符
- 没有多余的空格
- 大小写敏感

### 检查2：检查浏览器控制台
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 尝试登录
4. 查看是否有错误信息
5. 截图发送给我

### 检查3：检查 Supabase 配置
1. 进入 Supabase Dashboard → **Settings** → **API**
2. 确认 **Project URL** 和 **anon key** 正确
3. 检查 `.env.local` 文件中的配置是否正确

### 检查4：清除浏览器缓存
1. 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
2. 清除缓存和 Cookie
3. 重新尝试登录

### 检查5：尝试无痕模式
1. 打开浏览器的无痕/隐私模式
2. 访问网站
3. 尝试登录
4. 如果无痕模式可以登录，说明是浏览器缓存问题

---

## 快速诊断 SQL

执行以下 SQL 检查账号完整状态：

```sql
-- 完整诊断
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.last_sign_in_at,
  u.banned_until,
  p.user_id as has_profile,
  p.username,
  p.credits_remaining,
  p.is_admin,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '❌ 邮箱未验证'
    WHEN u.banned_until IS NOT NULL THEN '❌ 账号被禁用'
    WHEN p.user_id IS NULL THEN '❌ Profile 不存在'
    ELSE '✅ 账号正常（可能是密码错误）'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = '3941906903@qq.com';
```

---

## 如果所有方法都失败

1. **注册新账号**：
   - 使用不同的邮箱注册新账号
   - 或者使用 Google 登录

2. **联系支持**：
   - 检查 Supabase Dashboard 中的错误日志
   - 查看是否有账号被禁用的记录

---

## 重要提示

**密码是加密存储的，无法直接查看或修改。** 必须通过重置密码功能来设置新密码。

如果重置密码邮件收不到：
1. 检查垃圾邮件文件夹
2. 确认邮箱地址正确
3. 检查 Supabase 的邮件发送配置
4. 等待几分钟后重试

