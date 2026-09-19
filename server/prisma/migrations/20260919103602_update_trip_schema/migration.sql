/*
  Warnings:

  - You are about to drop the column `currency` on the `trips` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `trips` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `trips` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `trips` table. All the data in the column will be lost.
  - You are about to alter the column `invite_code` on the `trips` table. The data in that column could be lost. The data in that column will be cast from `VarChar(64)` to `VarChar(6)`.
  - Added the required column `province` to the `trips` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('TOTAL', 'PER_PERSON');

-- AlterTable
ALTER TABLE "trips" DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "destination",
DROP COLUMN "end_date",
ADD COLUMN     "budget_amount" DECIMAL(12,2),
ADD COLUMN     "budget_type" "BudgetType",
ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "promptpay_number" VARCHAR(50),
ADD COLUMN     "province" VARCHAR(100) NOT NULL,
ALTER COLUMN "invite_code" SET DATA TYPE VARCHAR(6);

-- CreateIndex
CREATE INDEX "idx_trips_province" ON "trips"("province");
