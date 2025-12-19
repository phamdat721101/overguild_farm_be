-- SYNC ALL TABLES - Run this in Supabase SQL Editor
-- This ensures all tables and columns exist

-- 1. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_free_water_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_gem INT DEFAULT 0;

-- 2. Add missing columns to plants table
ALTER TABLE plants ADD COLUMN IF NOT EXISTS water_balance INT DEFAULT 0;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS active_growth_hours INT DEFAULT 0;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS withered_at TIMESTAMP WITH TIME ZONE;

-- 3. Create seeds table
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

-- 4. Create shop_purchases table
CREATE TABLE IF NOT EXISTS shop_purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_type TEXT NOT NULL,
  item_key TEXT NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON shop_purchases(user_id, shop_type, item_key, created_at);

-- 5. Create phygital_redemptions table
CREATE TABLE IF NOT EXISTS phygital_redemptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  cost_amount INT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phygital_user ON phygital_redemptions(user_id);

-- 6. Create daily_streaks table
CREATE TABLE IF NOT EXISTS daily_streaks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  last_checkin_at TIMESTAMP WITH TIME ZONE,
  total_cycles INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_checkin ON daily_streaks(last_checkin_at, current_streak);

-- 7. Create streak_checkins table
CREATE TABLE IF NOT EXISTS streak_checkins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_day INT NOT NULL,
  rewards JSONB NOT NULL,
  checkin_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_streak_checkins_user ON streak_checkins(user_id, checkin_at);

-- Done!
SELECT 'All tables synced successfully!' as result;

