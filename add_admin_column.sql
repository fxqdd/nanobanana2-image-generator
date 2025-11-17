-- 第一步：添加 is_admin 列到 profiles 表
-- 如果列已存在，这个脚本会安全地跳过

-- 检查并添加 is_admin 列
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
        
        -- 添加注释
        COMMENT ON COLUMN profiles.is_admin IS '是否为管理员账号';
        
        RAISE NOTICE 'is_admin 列已成功添加';
    ELSE
        RAISE NOTICE 'is_admin 列已存在，跳过添加';
    END IF;
END $$;

-- 验证列是否添加成功
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'is_admin';

