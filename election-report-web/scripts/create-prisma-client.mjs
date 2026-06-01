import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });
}
