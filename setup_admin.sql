-- 设置管理员账号和无限点数的 SQL 脚本
-- 使用方法：在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 方法1：通过邮箱查找并设置（推荐）
-- 将 '3941906903@qq.com' 替换为你的实际邮箱
UPDATE profiles
SET 
  is_admin = true,
  credits_remaining = 999999  -- 设置为一个很大的数字，表示"无限"
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = '3941906903@qq.com'
);

-- 方法2：如果你知道 user_id，直接使用（更准确）
-- 首先查询你的 user_id（在 Supabase SQL Editor 中执行）：
-- SELECT id, email FROM auth.users WHERE email = '3941906903@qq.com';
-- 
-- 然后将查询到的 user_id 替换到下面的脚本中：
-- UPDATE profiles
-- SET 
--   is_admin = true,
--   credits_remaining = 999999
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- 验证设置是否成功
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

