# 积分系统使用指南

## 功能概述

已为 Nano Banana2 AI 工具站实现了完整的积分（点数）管理系统，包括：

1. **点数检查**：在生成图像前检查用户点数是否足够
2. **实时更新**：点数在生成后自动更新，并在账户页面每30秒刷新
3. **管理员面板**：管理员可以查看和修改所有用户的点数、计划等信息

## 数据库要求

### Supabase 表结构

确保 `profiles` 表包含以下字段：

- `user_id` (uuid, primary key) - 用户ID
- `credits_remaining` (integer, default 0) - 剩余积分
- `plan` (text, default 'basic') - 用户计划（basic/professional/enterprise）
- `is_admin` (boolean, default false) - 是否为管理员
- `username` (text) - 用户名
- `email` (text, optional) - 邮箱（如果需要在管理员面板显示）

### RPC 函数

确保 Supabase 中存在 `create_generation_with_charge` RPC 函数，用于：
- 创建生成记录
- 自动扣减用户积分
- 返回生成记录ID

示例 SQL（需要在 Supabase SQL Editor 中执行）：

```sql
CREATE OR REPLACE FUNCTION create_generation_with_charge(
  p_model TEXT,
  p_prompt TEXT,
  p_result_url TEXT,
  p_duration_ms INTEGER DEFAULT 0,
  p_cost INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_generation_id UUID;
  v_current_credits INTEGER;
BEGIN
  -- 获取当前用户ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- 检查点数是否足够
  SELECT credits_remaining INTO v_current_credits
  FROM profiles
  WHERE user_id = v_user_id;
  
  IF v_current_credits IS NULL OR v_current_credits < p_cost THEN
    RAISE EXCEPTION 'Insufficient credits: required %, current %', p_cost, COALESCE(v_current_credits, 0);
  END IF;
  
  -- 创建生成记录
  INSERT INTO generations (user_id, model, prompt, result_url, duration_ms, cost)
  VALUES (v_user_id, p_model, p_prompt, p_result_url, p_duration_ms, p_cost)
  RETURNING id INTO v_generation_id;
  
  -- 扣减积分
  UPDATE profiles
  SET credits_remaining = credits_remaining - p_cost
  WHERE user_id = v_user_id;
  
  RETURN v_generation_id;
END;
$$;
```

### 表结构

确保存在 `generations` 表：

```sql
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result_url TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at);
```

## 如何设置管理员

### 方法1：通过 Supabase Dashboard

1. 登录 Supabase Dashboard
2. 进入 Table Editor，选择 `profiles` 表
3. 找到要设置为管理员的用户记录
4. 将 `is_admin` 字段设置为 `true`

### 方法2：通过 SQL

```sql
UPDATE profiles
SET is_admin = true
WHERE user_id = 'YOUR_USER_ID_HERE';
```

## 管理员面板访问

管理员可以通过以下 URL 访问管理员面板：

- 中文：`/zh/admin` 或 `/admin`
- 英文：`/en/admin`
- 其他语言：`/{lang}/admin`

## 功能说明

### 1. 点数检查（Editor.jsx）

- 在用户点击"生成"按钮时，系统会先检查用户点数是否足够
- 如果点数不足，会显示错误消息并阻止生成
- 错误消息格式：`点数不足！需要 X 点，当前只有 Y 点。`

### 2. 实时更新

- **Editor 页面**：每30秒自动更新一次点数
- **Account 页面**：每30秒自动刷新账户信息（包括点数）
- **生成后**：生成成功后立即更新点数显示

### 3. 管理员功能

管理员可以：
- 查看所有用户列表（分页显示，每页20个）
- 搜索用户（按用户名、邮箱或用户ID）
- 编辑用户点数
- 修改用户计划（basic/professional/enterprise）
- 刷新用户列表

### 4. 点数消耗规则

当前点数消耗规则（在 `Editor.jsx` 的 `computeCost` 函数中定义）：

**文生图（Text to Image）**：
- Nano Banana: 2点
- GPT-5 Image Mini: 2点
- GPT-5 Image: 3点
- SeeDream-4: 2点

**图生图（Image Edit）**：
- Nano Banana: 4点
- GPT-5 Image / GPT-5 Image Mini: 3点
- SeeDream-4: 2点

## 修改点数消耗规则

编辑 `src/pages/Editor.jsx` 文件中的 `computeCost` 函数（第27-39行）。

## 修改点数更新频率

- **Editor 页面**：编辑 `src/pages/Editor.jsx` 第258行的 `30000`（30秒 = 30000毫秒）
- **Account 页面**：编辑 `src/pages/Account.jsx` 第38行的 `30000`

## 常见问题

### Q: 如何给新用户初始点数？

A: 可以通过管理员面板修改，或者在 Supabase 中直接设置 `profiles` 表的 `credits_remaining` 字段。

### Q: 点数可以为负数吗？

A: 可以，但系统会在生成前检查，负数时无法生成图像。

### Q: 如何查看用户的生成历史？

A: 查询 `generations` 表，按 `user_id` 和 `created_at` 排序。

### Q: 管理员面板显示"访问被拒绝"？

A: 确保该用户的 `profiles` 表中 `is_admin` 字段为 `true`。

## 文件清单

已修改/创建的文件：

1. `src/services/db.js` - 添加了点数检查和管理员函数
2. `src/pages/Editor.jsx` - 添加了生成前点数检查和实时更新
3. `src/pages/Account.jsx` - 添加了实时更新点数功能
4. `src/pages/Admin.jsx` - 新建管理员面板
5. `src/App.jsx` - 添加了管理员路由
6. `src/locales/zh.js` - 添加了中文翻译
7. `src/locales/en.js` - 添加了英文翻译

## 下一步

1. 在 Supabase 中执行上述 SQL 创建 RPC 函数和表
2. 设置至少一个管理员账户
3. 测试点数检查和扣减功能
4. 测试管理员面板功能

