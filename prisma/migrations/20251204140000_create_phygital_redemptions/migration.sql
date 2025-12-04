-- CreateTable
CREATE TABLE IF NOT EXISTS "phygital_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Use text here to match users.id (text) in Supabase
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reward_key" text NOT NULL,
  "payment_type" text NOT NULL,
  "cost_amount" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "phygital_redemptions_user_id_idx"
  ON "phygital_redemptions" ("user_id");
