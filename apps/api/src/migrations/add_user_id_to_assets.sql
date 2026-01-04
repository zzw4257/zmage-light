-- Multi-user Asset Authorization Migration
-- Date: 2026-01-04
-- Description: Add user_id to assets table for proper ownership tracking

-- Step 1: Add user_id column (nullable initially)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Step 2: Assign all existing assets to the first admin user (user_id = 1)
-- If no users exist, this will fail - ensure at least one user exists first
UPDATE assets SET user_id = 1 WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL and add foreign key constraint
ALTER TABLE assets 
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE assets 
  ADD CONSTRAINT assets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS ix_assets_user_id ON assets(user_id);

-- Verification query
-- SELECT COUNT(*), user_id FROM assets GROUP BY user_id;
