/*
  Warnings:

  - You are about to drop the column `assigned_to_id` on the `trip_todos` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `trip_todos` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `trip_todos` table. All the data in the column will be lost.
  - Added the required column `created_by_id` to the `trip_todos` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "trip_todos" DROP CONSTRAINT "trip_todos_assigned_to_id_fkey";

-- AlterTable
ALTER TABLE "trip_todos" DROP COLUMN "assigned_to_id",
DROP COLUMN "category",
DROP COLUMN "due_date",
ADD COLUMN     "created_by_id" UUID NOT NULL,
ADD COLUMN     "sticker" VARCHAR(100);

-- AddForeignKey
ALTER TABLE "trip_todos" ADD CONSTRAINT "trip_todos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
