import { PrismaPg } from "@prisma/adapter-pg";
import prismaClientPkg from "@prisma/client";

const { PrismaClient } = prismaClientPkg;

export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });
}
