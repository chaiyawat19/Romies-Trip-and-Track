-- AlterTable
ALTER TABLE "trips" ALTER COLUMN "province" DROP NOT NULL;

-- CreateTable
CREATE TABLE "trip_provinces" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "province_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "trip_provinces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_trip_provinces_trip_id" ON "trip_provinces"("trip_id");

-- CreateIndex
CREATE INDEX "idx_trip_provinces_province_id" ON "trip_provinces"("province_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_provinces_trip_id_province_id_key" ON "trip_provinces"("trip_id", "province_id");

-- AddForeignKey
ALTER TABLE "trip_provinces" ADD CONSTRAINT "trip_provinces_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_provinces" ADD CONSTRAINT "trip_provinces_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
