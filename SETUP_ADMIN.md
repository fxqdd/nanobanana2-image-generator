# 设置管理员账号指南

## ⚠️ 重要提示

**如果遇到错误 "column is_admin does not exist"**，说明 `profiles` 表中还没有 `is_admin` 列。请先执行 `add_admin_column.sql` 或使用下面的完整脚本。

---

## 方法1：一键完整设置（推荐）

### 步骤1：登录 Supabase Dashboard
1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 登录你的账号
3. 选择你的项目

### 步骤2：执行完整脚本
1. 进入 **SQL Editor**
2. 复制 `setup_admin_complete.sql` 文件中的**全部内容**
3. 粘贴到 SQL Editor 中
4. 点击 **Run** 或按 `Ctrl + Enter` 执行

这个脚本会：
- ✅ 自动检查并添加 `is_admin` 列（如果不存在）
- ✅ 设置你的账号为管理员
- ✅ 设置点数为 999999（无限）
- ✅ 验证设置结果

### 步骤3：查看结果
执行后，在结果面板中应该看到：
- `is_admin` = `true`
- `credits_remaining` = `999999`
- `admin_status` = `✅ 是管理员`

---

## 方法2：分步执行（如果方法1失败）

### 步骤1：添加 is_admin 列
1. 在 **SQL Editor** 中执行 `add_admin_column.sql` 的内容
2. 确认列已成功添加

### 步骤2：设置管理员权限和点数
1. 在 **SQL Editor** 中执行以下 SQL：
```sql
-- 设置管理员权限和无限点数
UPDATE profiles
SET 
  is_admin = true,
  credits_remaining = 999999
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = '3941906903@qq.com'
);
```

### 步骤3：验证设置
```sql
SELECT 
  p.user_id,
  u.email,
  p.username,
  p.is_admin,
  p.credits_remaining,
  p.plan
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.email = '3941906903@qq.com';
```

### 步骤4：验证设置
执行以下查询验证设置是否成功：
```sql
SELECT 
  p.user_id,
  u.email,
  p.username,
  p.is_admin,
  p.credits_remaining,
  p.plan
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.email = '3941906903@qq.com';
```

应该看到：
- `is_admin` = `true`
- `credits_remaining` = `999999`

---

## 方法2：通过 Table Editor（简单但需要手动操作）

### 步骤1：进入 Table Editor
1. 在 Supabase Dashboard 中，点击左侧菜单的 **Table Editor**
2. 选择 `profiles` 表

### 步骤2：查找你的记录
1. 在搜索框中输入你的邮箱或用户名
2. 找到你的用户记录

### 步骤3：编辑记录
1. 点击你的用户记录进行编辑
2. 将 `is_admin` 字段设置为 `true`（勾选复选框）
3. 将 `credits_remaining` 字段设置为 `999999` 或更大的数字
4. 点击 **Save** 保存

---

## 方法3：使用提供的 SQL 脚本

我已经创建了 `setup_admin.sql` 文件，你可以：

1. 打开 Supabase Dashboard → SQL Editor
2. 复制 `setup_admin.sql` 文件中的内容
3. 将邮箱 `3941906903@qq.com` 替换为你的实际邮箱（如果需要）
4. 执行 SQL 脚本

---

## 验证管理员功能

设置完成后：

1. **刷新浏览器**（硬刷新：`Ctrl + Shift + R`）
2. **重新登录**你的账号
3. **检查导航栏**：
   - 点击右上角用户头像
   - 应该能看到 **"管理员面板"** 链接（橙色高亮）
4. **访问管理员面板**：
   - 点击 "管理员面板" 链接
   - 或直接访问：`/zh/admin` 或 `/en/admin`
5. **测试功能**：
   - 应该能看到所有用户列表
   - 可以搜索用户
   - 可以编辑用户点数和计划

---

## 管理员功能说明

设置完成后，你可以：

### ✅ 查看所有用户
- 在管理员面板中查看所有注册用户
- 每页显示20个用户
- 支持按用户名、邮箱或用户ID搜索

### ✅ 修改用户点数
1. 在用户列表中找到目标用户
2. 点击 **"编辑"** 按钮
3. 修改 **"积分"** 字段
4. 点击 **"保存"**

### ✅ 修改用户计划
1. 在编辑用户时
2. 修改 **"计划"** 下拉菜单（basic/professional/enterprise）
3. 点击 **"保存"**

### ✅ 无限点数
- 你的账号点数设置为 `999999`，基本等同于无限
- 生成图像时不会因为点数不足而被阻止
- 但系统仍会记录点数消耗（用于统计）

---

## 注意事项

1. **安全性**：
   - 管理员权限非常强大，请妥善保管账号
   - 建议使用强密码
   - 不要将管理员账号分享给他人

2. **点数设置**：
   - `999999` 是一个很大的数字，基本等同于无限
   - 如果需要真正的"无限"，可以修改代码跳过点数检查
   - 但建议保留点数记录以便统计

3. **数据库字段**：
   - 确保 `profiles` 表中有 `is_admin` 字段（布尔类型）
   - 确保 `profiles` 表中有 `credits_remaining` 字段（整数类型）

4. **如果遇到问题**：
   - 检查浏览器控制台是否有错误
   - 确认 `is_admin` 字段确实设置为 `true`
   - 尝试重新登录账号
   - 清除浏览器缓存

---

## 快速 SQL 脚本（一键设置 - 包含创建列）

**推荐使用这个完整脚本**（会自动处理列不存在的情况）：

```sql
-- 第一步：添加 is_admin 列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE '✅ is_admin 列已成功添加';
    END IF;
END $$;

-- 第二步：设置管理员权限和无限点数
UPDATE profiles
SET 
  is_admin = true,
  credits_remaining = 999999
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = '3941906903@qq.com'
);

-- 第三步：验证结果
SELECT 
  p.user_id,
  u.email,
  p.username,
  p.is_admin,
  p.credits_remaining,
  p.plan,
  CASE 
    WHEN p.is_admin = true THEN '✅ 是管理员'
    ELSE '❌ 不是管理员'
  END as admin_status
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.email = '3941906903@qq.com';
```

执行后，刷新浏览器并重新登录即可使用管理员功能！

---

## 如果用户没有 profile 记录

如果执行后查询没有返回结果，说明该用户可能还没有 `profiles` 记录。可以执行以下 SQL 创建：

```sql
-- 创建 profile 记录（如果不存在）
INSERT INTO profiles (user_id, username, is_admin, credits_remaining, plan)
SELECT 
  id,
  split_part(email, '@', 1) as username,
  true as is_admin,
  999999 as credits_remaining,
  'professional' as plan
FROM auth.users
WHERE email = '3941906903@qq.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.users.id
)
ON CONFLICT (user_id) DO UPDATE
SET 
  is_admin = true,
  credits_remaining = 999999;
```

