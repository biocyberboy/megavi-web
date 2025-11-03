import { defineConfig, env } from "prisma/config";
import { config as loadEnv } from "dotenv";
import { join } from "node:path";

const root = process.cwd();

loadEnv({ path: join(root, ".env") });
loadEnv({ path: join(root, ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"), // Use DATABASE_URL for migrations (pooled connection)
  },
});
