function isProductionEnvironment() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function assertLocalTestOnly(scriptName) {
  if (!isProductionEnvironment()) {
    return;
  }

  console.error(`[blocked] ${scriptName} is a local test tool and is disabled when NODE_ENV=production.`);
  process.exit(1);
}
