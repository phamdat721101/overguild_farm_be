-- Add missing columns to users table
-- Run this in Supabase SQL Editor

-- Referrer system
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_id TEXT;

-- Gem balance
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_gem INT DEFAULT 0;

-- Create index for referrer
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id);

