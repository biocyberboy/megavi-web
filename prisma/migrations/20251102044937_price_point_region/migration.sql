/*
  Warnings:

  - A unique constraint covering the columns `[seriesId,region,ts]` on the table `PricePoint` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `region` to the `PricePoint` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."PricePoint_seriesId_ts_idx";

-- DropIndex
DROP INDEX "public"."PricePoint_seriesId_ts_key";

-- AlterTable
ALTER TABLE "PricePoint" ADD COLUMN     "region" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PriceSeries" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PricePoint_seriesId_region_ts_idx" ON "PricePoint"("seriesId", "region", "ts" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PricePoint_seriesId_region_ts_key" ON "PricePoint"("seriesId", "region", "ts");
