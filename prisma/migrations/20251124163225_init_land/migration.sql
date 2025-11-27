-- CreateTable
CREATE TABLE "lands" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "plot_index" INTEGER NOT NULL DEFAULT 0,
    "soil_quality" JSONB,
    "seed_type" TEXT,
    "growth_stage" TEXT NOT NULL,
    "growth_points" INTEGER NOT NULL DEFAULT 0,
    "task_status" JSONB,
    "planted_at" TIMESTAMP(3),
    "last_progress_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "bounty_claimed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_tasks" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "task_code" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "last_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lands_wallet_address_key" ON "lands"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "land_tasks_wallet_address_task_code_key" ON "land_tasks"("wallet_address", "task_code");

-- AddForeignKey
ALTER TABLE "land_tasks" ADD CONSTRAINT "land_tasks_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "lands"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;
