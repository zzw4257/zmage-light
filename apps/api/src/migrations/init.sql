-- Zmage 数据库初始化脚本
-- 创建所有必要的表和索引

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    path VARCHAR(1024) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);

-- 资产表
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    thumbnail_path VARCHAR(1024),
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64),
    mime_type VARCHAR(128) NOT NULL,
    asset_type VARCHAR(32) NOT NULL DEFAULT 'other',
    width INTEGER,
    height INTEGER,
    duration FLOAT,
    title VARCHAR(512),
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    ocr_text TEXT,
    exif_data JSONB,
    taken_at TIMESTAMP WITH TIME ZONE,
    camera_model VARCHAR(255),
    location VARCHAR(512),
    latitude FLOAT,
    longitude FLOAT,
    custom_fields JSONB DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    vector_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_file_hash ON assets(file_hash);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);

-- 相册表
CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    album_type VARCHAR(32) NOT NULL DEFAULT 'manual',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    suggestion_reason TEXT,
    suggestion_score FLOAT,
    smart_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_albums_album_type ON albums(album_type);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);

-- 相册资产关联表
CREATE TABLE IF NOT EXISTS album_assets (
    id SERIAL PRIMARY KEY,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_album_assets_album_id ON album_assets(album_id);
CREATE INDEX IF NOT EXISTS idx_album_assets_asset_id ON album_assets(asset_id);

-- 集合表
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    cover_asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 集合资产关联表
CREATE TABLE IF NOT EXISTS collection_assets (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_assets_collection_id ON collection_assets(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_assets_asset_id ON collection_assets(asset_id);

-- 分享表
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    share_code VARCHAR(32) NOT NULL UNIQUE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL DEFAULT 'view',
    password_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT share_target_check CHECK (
        (asset_id IS NOT NULL AND collection_id IS NULL) OR
        (asset_id IS NULL AND collection_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_shares_share_code ON shares(share_code);
CREATE INDEX IF NOT EXISTS idx_shares_asset_id ON shares(asset_id);
CREATE INDEX IF NOT EXISTS idx_shares_collection_id ON shares(collection_id);

-- Portal 表
CREATE TABLE IF NOT EXISTS portals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    welcome_message TEXT,
    primary_color VARCHAR(32),
    visible_fields TEXT[] DEFAULT '{}',
    searchable BOOLEAN DEFAULT FALSE,
    filterable BOOLEAN DEFAULT FALSE,
    allow_download BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    upload_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portals_slug ON portals(slug);

-- 下载预设表
CREATE TABLE IF NOT EXISTS download_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    width INTEGER,
    height INTEGER,
    aspect_ratio VARCHAR(32),
    format VARCHAR(32) NOT NULL DEFAULT 'original',
    quality INTEGER NOT NULL DEFAULT 90,
    "order" INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default download presets (only if users table has at least one user)
-- This is commented out because it requires a valid user_id.
-- Default presets should be created in the app logic when a user registers.
-- INSERT INTO download_presets (name, description, format, quality, is_default, "order", user_id) 
-- SELECT '原图', '保持原始格式和尺寸', 'original', 100, TRUE, 0, id FROM users LIMIT 1
-- ON CONFLICT DO NOTHING;

-- 自定义字段定义表
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(32) NOT NULL,
    options TEXT[],
    required BOOLEAN DEFAULT FALSE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认设置
INSERT INTO settings (key, value) VALUES
    ('last_scan_time', 'null'),
    ('ai_enabled', 'true'),
    ('duplicate_detection_enabled', 'true'),
    ('album_suggestion_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['folders', 'assets', 'albums', 'collections', 'portals', 'settings'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- 完成
SELECT 'Zmage database initialized successfully' AS status;

-- 2026-01-03: Add Recycle Bin (Soft Delete) and Private Vault columns
ALTER TABLE assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_assets_is_private ON assets(is_private);

ALTER TABLE albums ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_albums_deleted_at ON albums(deleted_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS vault_pin_hash VARCHAR(255);

-- 2026-01-04: Add multi-user isolation columns to existing tables
-- Add user_id to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);

-- Add user_id to folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

-- Add user_id to albums table 
ALTER TABLE albums ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);

-- Add user_id to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- Add user_id to shares table
ALTER TABLE shares ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);

-- Add user_id to portals table
ALTER TABLE portals ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_portals_user_id ON portals(user_id);

-- Add user_id to download_presets table
ALTER TABLE download_presets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_download_presets_user_id ON download_presets(user_id);

-- Add user_id to custom_field_definitions table (if exists)
ALTER TABLE custom_field_definitions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_user_id ON custom_field_definitions(user_id);

-- Add user_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
