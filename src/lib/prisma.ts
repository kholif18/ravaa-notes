import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
function create() {
  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
  return new PrismaClient({ adapter });
}
export const prisma: PrismaClient = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
