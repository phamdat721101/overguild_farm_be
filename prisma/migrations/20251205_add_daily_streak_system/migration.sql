-- CreateTable
CREATE TABLE "daily_streaks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "last_checkin_at" TIMESTAMP(3),
    "total_cycles" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_checkins" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "streak_day" INTEGER NOT NULL,
    "rewards" JSONB NOT NULL,
    "checkin_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_streaks_user_id_key" ON "daily_streaks"("user_id");

-- CreateIndex
CREATE INDEX "daily_streaks_last_checkin_at_current_streak_idx" ON "daily_streaks"("last_checkin_at", "current_streak");

-- CreateIndex
CREATE INDEX "streak_checkins_user_id_checkin_at_idx" ON "streak_checkins"("user_id", "checkin_at");

-- AddForeignKey
ALTER TABLE "daily_streaks" ADD CONSTRAINT "daily_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_checkins" ADD CONSTRAINT "streak_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
