import { config } from "dotenv";

import { createPrismaClient } from "./create-prisma-client.mjs";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const prisma = createPrismaClient();

try {
  const rows = await prisma.$queryRaw`SELECT 1::int AS ok`;
  const ok = Array.isArray(rows) && rows[0]?.ok === 1;

  if (!ok) {
    throw new Error("PostgreSQL responded, but the health query was unexpected.");
  }

  console.log("DB connection OK");
} finally {
  await prisma.$disconnect();
}
