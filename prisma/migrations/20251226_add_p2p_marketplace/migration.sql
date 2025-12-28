-- P2P Trade System (Ngọc Rồng style)
CREATE TABLE "trade_requests" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sender_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "receiver_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_requests_pkey" PRIMARY KEY ("id")
);

-- Items offered in trade
CREATE TABLE "trade_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "trade_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "amount" INT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_items_pkey" PRIMARY KEY ("id")
);

-- Gold/Gem offered in trade
CREATE TABLE "trade_currencies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "trade_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "currency_type" TEXT NOT NULL,
    "amount" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_currencies_pkey" PRIMARY KEY ("id")
);

-- Marketplace listings (sạp hàng)
CREATE TABLE "market_listings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "seller_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "amount" INT NOT NULL DEFAULT 1,
    "price_gold" INT,
    "price_gem" INT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sold_at" TIMESTAMP(3),
    "buyer_id" TEXT,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

-- Trade history log
CREATE TABLE "trade_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "trade_id" TEXT,
    "listing_id" TEXT,
    "type" TEXT NOT NULL,
    "user1_id" TEXT NOT NULL,
    "user2_id" TEXT,
    "items_exchanged" JSONB,
    "currencies_exchanged" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "trade_requests_sender_id_idx" ON "trade_requests"("sender_id");
CREATE INDEX "trade_requests_receiver_id_idx" ON "trade_requests"("receiver_id");
CREATE INDEX "trade_requests_status_idx" ON "trade_requests"("status");
CREATE INDEX "trade_items_trade_id_idx" ON "trade_items"("trade_id");
CREATE INDEX "trade_currencies_trade_id_idx" ON "trade_currencies"("trade_id");
CREATE INDEX "market_listings_seller_id_idx" ON "market_listings"("seller_id");
CREATE INDEX "market_listings_status_idx" ON "market_listings"("status");
CREATE INDEX "market_listings_item_type_idx" ON "market_listings"("item_type");

-- Foreign Keys
ALTER TABLE "trade_requests" ADD CONSTRAINT "trade_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_requests" ADD CONSTRAINT "trade_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_currencies" ADD CONSTRAINT "trade_currencies_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_currencies" ADD CONSTRAINT "trade_currencies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
