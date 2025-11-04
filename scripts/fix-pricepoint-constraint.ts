import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const statements = [
    'ALTER TABLE "PricePoint" DROP CONSTRAINT IF EXISTS "PricePoint_seriesId_region_company_ts_key"',
    'ALTER TABLE "PricePoint" DROP CONSTRAINT IF EXISTS "PricePoint_seriesId_region_ts_key"',
    'DROP INDEX IF EXISTS "public"."PricePoint_seriesId_region_ts_key"',
    'DROP INDEX IF EXISTS "public"."PricePoint_seriesId_region_ts_idx"',
    'DROP INDEX IF EXISTS "public"."PricePoint_seriesId_ts_idx"',
    'ALTER TABLE "PricePoint" ADD CONSTRAINT "PricePoint_seriesId_region_company_ts_key" UNIQUE ("seriesId", "region", "company", "ts")',
    'CREATE INDEX IF NOT EXISTS "PricePoint_seriesId_region_company_ts_idx" ON "PricePoint" ("seriesId", "region", "company", "ts" DESC)',
  ];

  for (const sql of statements) {
    console.log(`Running: ${sql}`);
    await prisma.$executeRawUnsafe(sql);
  }
}

main()
  .catch((error) => {
    console.error("Failed to adjust PricePoint constraints:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
