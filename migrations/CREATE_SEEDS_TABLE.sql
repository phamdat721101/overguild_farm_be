-- Create seeds table if not exists
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS seeds (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  rarity TEXT DEFAULT 'COMMON',
  quantity INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seeds_user_type ON seeds(user_id, type);

