/*
  Warnings:

  - Added the required column `creator_wallet` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "creator_wallet" TEXT NOT NULL;
