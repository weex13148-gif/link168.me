import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
const connectionString = process.env.DATABASE_URL || "postgresql://invalid:invalid@localhost:5432/invalid";

const adapter = new PrismaPg({ connectionString });

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// P0: 事务客户端类型。使用 Parameters 提取 $transaction 回调参数的 tx 类型，
// Prisma 7 TransactionClient 类型为 Omit<PrismaClient, "$connect"|"$disconnect"|"$on"|"$use"|"$extends">，
// 而 PrismaClient 有 $extends；两者均需被本类型接受。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuditDbClient = Parameters<Parameters<typeof db.$transaction>[0]>[0] extends infer T ? T extends { adminAuditLog: unknown } ? T : never : never;
