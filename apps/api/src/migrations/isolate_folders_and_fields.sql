-- 为 folders 和 custom_fields 表添加 user_id 字段
-- 默认关联到 ID 为 1 的用户 (通常是首个用户)

-- 1. 更新 folders 表
ALTER TABLE folders ADD COLUMN user_id INTEGER;
UPDATE folders SET user_id = 1;
ALTER TABLE folders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE folders ADD CONSTRAINT fk_folders_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_folders_user_id ON folders(user_id);

-- 2. 更新 custom_fields 表
-- 注意：custom_fields 原本有 UNIQUE 约束在 name 上，隔离后应该是 (user_id, name) UNIQUE
ALTER TABLE custom_fields ADD COLUMN user_id INTEGER;
UPDATE custom_fields SET user_id = 1;
ALTER TABLE custom_fields ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE custom_fields ADD CONSTRAINT fk_custom_fields_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_custom_fields_user_id ON custom_fields(user_id);

-- 更新 UNIQUE 约束
ALTER TABLE custom_fields DROP CONSTRAINT IF EXISTS custom_fields_name_key;
ALTER TABLE custom_fields ADD CONSTRAINT uq_custom_fields_user_name UNIQUE (user_id, name);
