-- AlterTable
ALTER TABLE "plants" ADD COLUMN "daily_water_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plants" ADD COLUMN "last_water_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "plants_last_water_date_idx" ON "plants"("last_water_date");
