-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "name_th" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "region" VARCHAR(50) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_th_key" ON "provinces"("name_th");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_en_key" ON "provinces"("name_en");

-- CreateIndex
CREATE INDEX "idx_provinces_region" ON "provinces"("region");
