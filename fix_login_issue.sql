-- 修复登录问题的完整脚本
-- 执行此脚本后，如果仍然无法登录，请重置密码

-- 步骤1：检查账号状态
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.user_id as profile_exists,
  p.username,
  p.credits_remaining,
  p.is_admin,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '❌ 邮箱未验证'
    WHEN p.user_id IS NULL THEN '❌ Profile 记录不存在'
    ELSE '✅ 账号正常'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = '3941906903@qq.com';

-- 步骤2：确保邮箱已验证（如果未验证）
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = '3941906903@qq.com'
AND email_confirmed_at IS NULL;

-- 步骤3：创建或更新 profile 记录（如果不存在）
INSERT INTO profiles (
  user_id, 
  username, 
  email,
  credits_remaining, 
  plan,
  is_admin
)
SELECT 
  u.id,
  COALESCE(
    split_part(u.email, '@', 1),
    'user_' || substr(u.id::text, 1, 8)
  ) as username,
  u.email,
  999999 as credits_remaining,
  'professional' as plan,
  true as is_admin
FROM auth.users u
WHERE u.email = '3941906903@qq.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE user_id = u.id
)
ON CONFLICT (user_id) DO UPDATE
SET 
  email = COALESCE(profiles.email, EXCLUDED.email),
  username = COALESCE(profiles.username, EXCLUDED.username),
  credits_remaining = COALESCE(profiles.credits_remaining, 999999),
  is_admin = COALESCE(profiles.is_admin, true);

-- 步骤4：验证修复结果
SELECT 
  u.email,
  u.email_confirmed_at,
  p.username,
  p.credits_remaining,
  p.is_admin,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL AND p.user_id IS NOT NULL THEN '✅ 可以登录'
    ELSE '❌ 仍有问题'
  END as final_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = '3941906903@qq.com';

