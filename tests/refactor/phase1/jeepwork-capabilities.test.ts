import fs from "node:fs";

const jeepworkSource = fs.readFileSync("src/lib/jeepwork-auth.ts", "utf8");
const adminSource = fs.readFileSync("src/lib/admin-auth.ts", "utf8");

describe("Phase 1 Jeepwork capability enforcement", () => {
  test("session selection includes every account state input", () => {
    expect(jeepworkSource).toContain('emailVerified: true');
    expect(jeepworkSource).toContain('accountStatus: true');
    expect(jeepworkSource).toContain('role: true');
  });

  test("session and login access use the shared evaluator and active restrictions", () => {
    expect(jeepworkSource).toContain('evaluateAccountCapabilities');
    expect(jeepworkSource).toContain('getActiveRestrictions');
    expect(jeepworkSource).toContain('restrictionTypes: restrictions.map((restriction) => restriction.type)');
    expect(jeepworkSource).toContain('if (!capabilities.canEnterJeepwork) return null;');
    expect(jeepworkSource).toContain('if (!capabilities.canEnterJeepwork) {');
  });

  test("restriction lookup failures fail closed for sessions and login", () => {
    expect(jeepworkSource).toContain('catch {\n    return null;\n  }');
    expect(jeepworkSource).toContain('RESTRICTION_SERVICE_UNAVAILABLE');
    expect(jeepworkSource).toContain('服务暂不可用');
  });

  test("Jeepwork login reads account status and email verification before creating a session", () => {
    expect(jeepworkSource).toMatch(/select:\s*\{[\s\S]*passwordHash:\s*true[\s\S]*emailVerified:\s*true[\s\S]*accountStatus:\s*true/);
    const capabilityCheck = jeepworkSource.indexOf('if (!capabilities.canEnterJeepwork) {');
    const sessionCreation = jeepworkSource.indexOf('createJeepworkSession(user.id, request)');
    expect(capabilityCheck).toBeGreaterThanOrEqual(0);
    expect(sessionCreation).toBeGreaterThan(capabilityCheck);
  });

  test("legacy admin helpers continue through the Jeepwork session guard", () => {
    expect(adminSource).toContain('getJeepworkSessionUser');
    expect(adminSource).not.toContain('db.user');
    expect(adminSource).not.toContain('db.session');
  });
});
