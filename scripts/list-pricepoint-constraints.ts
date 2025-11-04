import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const indexes = await prisma.$queryRaw<
    Array<{ indexname: string; indexdef: string }>
  >`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'PricePoint' ORDER BY indexname`;

  console.log("Indexes:");
  for (const row of indexes) {
    console.log(`- ${row.indexname}: ${row.indexdef}`);
  }

  const constraints = await prisma.$queryRaw<
    Array<{ conname: string; definition: string }>
  >`SELECT c.conname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'PricePoint' ORDER BY c.conname`;

  console.log("\nConstraints:");
  for (const row of constraints) {
    console.log(`- ${row.conname}: ${row.definition}`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to list constraints:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
