import "server-only";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type CurrentPrismaClient = PrismaClient | Prisma.TransactionClient;

export const currentDb = db;

export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function toNullableJsonValue(value: unknown | null): Prisma.InputJsonValue | Prisma.NullTypes.DbNull {
  return value === null ? Prisma.DbNull : toJsonValue(value);
}

export function fromJsonValue<T>(value: Prisma.JsonValue | null): T | null {
  return value as T | null;
}
