-- 迁移脚本：为相册、集合、门户和下载预设添加用户隔离
-- 为所有主要实体添加 user_id 列

-- 1. 为相册表添加 user_id
ALTER TABLE albums ADD COLUMN user_id INTEGER;
UPDATE albums SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE albums ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE albums ADD CONSTRAINT fk_albums_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_albums_user_id ON albums(user_id);

-- 2. 为集合表添加 user_id
ALTER TABLE collections ADD COLUMN user_id INTEGER;
UPDATE collections SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE collections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE collections ADD CONSTRAINT fk_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_collections_user_id ON collections(user_id);

-- 3. 为 portals 表添加 user_id
ALTER TABLE portals ADD COLUMN user_id INTEGER;
UPDATE portals SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE portals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE portals ADD CONSTRAINT fk_portals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_portals_user_id ON portals(user_id);

-- 4. 为下载预设表添加 user_id
ALTER TABLE download_presets ADD COLUMN user_id INTEGER;
UPDATE download_presets SET user_id = 1 WHERE user_id IS NULL;
ALTER TABLE download_presets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE download_presets ADD CONSTRAINT fk_download_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_download_presets_user_id ON download_presets(user_id);
