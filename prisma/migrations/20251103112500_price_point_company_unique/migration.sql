-- Adjust unique constraint to include company so multiple suppliers per region/day are allowed.

-- Drop any existing constraints/indexes still using the legacy key
ALTER TABLE "PricePoint"
  DROP CONSTRAINT IF EXISTS "PricePoint_seriesId_region_company_ts_key",
  DROP CONSTRAINT IF EXISTS "PricePoint_seriesId_region_ts_key";

DROP INDEX IF EXISTS "public"."PricePoint_seriesId_region_ts_key";
DROP INDEX IF EXISTS "public"."PricePoint_seriesId_region_ts_idx";
DROP INDEX IF EXISTS "public"."PricePoint_seriesId_ts_idx";

-- Add new unique constraint including company
ALTER TABLE "PricePoint"
  ADD CONSTRAINT "PricePoint_seriesId_region_company_ts_key"
  UNIQUE ("seriesId", "region", "company", "ts");

-- Add supporting index for ordering queries
CREATE INDEX IF NOT EXISTS "PricePoint_seriesId_region_company_ts_idx"
  ON "PricePoint" ("seriesId", "region", "company", "ts" DESC);
