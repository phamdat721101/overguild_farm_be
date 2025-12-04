/*
  Warnings:

  - The primary key for the `phygital_redemptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `shop_purchases` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "phygital_redemptions" DROP CONSTRAINT "phygital_redemptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "shop_purchases" DROP CONSTRAINT "shop_purchases_user_id_fkey";

-- AlterTable
ALTER TABLE "phygital_redemptions" DROP CONSTRAINT "phygital_redemptions_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "phygital_redemptions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "shop_purchases" DROP CONSTRAINT "shop_purchases_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "shop_purchases_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "balance_gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "balance_ruby" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "phygital_redemptions" ADD CONSTRAINT "phygital_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
