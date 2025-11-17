-- ============================================
-- 完整的管理员设置脚本（包含创建列和设置管理员）
-- ============================================

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
        
        COMMENT ON COLUMN profiles.is_admin IS '是否为管理员账号';
        
        RAISE NOTICE '✅ is_admin 列已成功添加';
    ELSE
        RAISE NOTICE 'ℹ️ is_admin 列已存在，跳过添加';
    END IF;
END $$;

-- 第二步：设置管理员权限和无限点数
UPDATE profiles
SET 
  is_admin = true,
  credits_remaining = 999999  -- 设置为一个很大的数字，表示"无限"
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = '3941906903@qq.com'
);

-- 第三步：验证设置是否成功
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

-- 如果上面的查询没有返回结果，说明该邮箱对应的用户可能还没有 profile 记录
-- 可以尝试创建 profile 记录（如果需要）：
-- INSERT INTO profiles (user_id, username, is_admin, credits_remaining, plan)
-- SELECT 
--   id,
--   email,
--   true,
--   999999,
--   'professional'
-- FROM auth.users
-- WHERE email = '3941906903@qq.com'
-- ON CONFLICT (user_id) DO UPDATE
-- SET 
--   is_admin = true,
--   credits_remaining = 999999;

