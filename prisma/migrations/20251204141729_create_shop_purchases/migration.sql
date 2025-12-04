-- CreateTable
CREATE TABLE IF NOT EXISTS "shop_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Use text here to match users.id (text) in Supabase
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shop_type" text NOT NULL,
  "item_key" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shop_purchases_user_id_shop_type_item_key_created_at_idx"
  ON "shop_purchases" ("user_id", "shop_type", "item_key", "created_at");


