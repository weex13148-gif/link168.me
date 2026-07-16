"use strict";

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ADMIN_SECRET",
  "CONFIG_ENCRYPTION_KEY",
  "NEXT_PUBLIC_APP_URL",
  "PAYMENT_RECONCILE_SECRET",
];

function fail(message) {
  console.error(`[release:preflight] ERROR: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`[release:preflight] OK: ${message}`);
}

function isPresent(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

for (const name of REQUIRED_VARIABLES) {
  if (!isPresent(name)) {
    fail(`${name} is missing`);
  } else {
    pass(`${name} is present`);
  }
}

if (isPresent("SESSION_SECRET") && process.env.SESSION_SECRET.trim().length < 32) {
  fail("SESSION_SECRET must be at least 32 characters");
}

if (isPresent("ADMIN_SECRET") && process.env.ADMIN_SECRET.trim().length < 32) {
  fail("ADMIN_SECRET must be at least 32 characters");
}

if (isPresent("CONFIG_ENCRYPTION_KEY") && process.env.CONFIG_ENCRYPTION_KEY.trim().length < 16) {
  fail("CONFIG_ENCRYPTION_KEY must be at least 16 characters and must preserve the existing production value");
}

if (isPresent("PAYMENT_RECONCILE_SECRET") && process.env.PAYMENT_RECONCILE_SECRET.trim().length < 32) {
  fail("PAYMENT_RECONCILE_SECRET must be at least 32 characters");
}

if (isPresent("DATABASE_URL") && !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL.trim())) {
  fail("DATABASE_URL must use PostgreSQL");
}

const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
const bypass = String(process.env.AUTH_RATE_LIMIT_BYPASS || "false").toLowerCase();

if (nodeEnv === "production") {
  if (!appUrl.startsWith("https://")) {
    fail("NEXT_PUBLIC_APP_URL must use HTTPS in production");
  }
  if (bypass === "true") {
    fail("AUTH_RATE_LIMIT_BYPASS must not be enabled in production");
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

pass("release environment variable names passed validation; values were not printed");
