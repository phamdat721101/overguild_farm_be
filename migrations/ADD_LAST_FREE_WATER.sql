-- Add last_free_water_at column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_free_water_at TIMESTAMP WITH TIME ZONE;

-- Optional: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_last_free_water_at ON users(last_free_water_at);

