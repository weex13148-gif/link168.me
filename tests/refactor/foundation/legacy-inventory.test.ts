import fs from "node:fs";
import path from "node:path";

type LegacyInventoryEntry = {
  path: string;
  status: "KEEP" | "MIGRATING" | "RETIRED";
  ownerPhase: number;
  reason: string;
};

const inventoryPath = "docs/superpowers/refactor/legacy-inventory.json";

function loadInventory(): LegacyInventoryEntry[] {
  return JSON.parse(fs.readFileSync(inventoryPath, "utf8")) as LegacyInventoryEntry[];
}

describe("Phase 0 legacy ownership inventory", () => {
  it("contains unique existing paths with an owner and a reason", () => {
    const inventory = loadInventory();
    const seen = new Set<string>();

    expect(inventory.length).toBeGreaterThan(0);
    for (const entry of inventory) {
      expect(seen.has(entry.path)).toBe(false);
      seen.add(entry.path);
      expect(["KEEP", "MIGRATING", "RETIRED"]).toContain(entry.status);
      expect(Number.isInteger(entry.ownerPhase)).toBe(true);
      expect(entry.ownerPhase).toBeGreaterThanOrEqual(0);
      expect(entry.ownerPhase).toBeLessThanOrEqual(5);
      expect(entry.reason.trim().length).toBeGreaterThan(10);
      expect(fs.existsSync(path.join(process.cwd(), entry.path))).toBe(true);
    }
  });

  it("protects showcase and Jeepwork while assigning migration ownership", () => {
    const inventory = loadInventory();

    expect(inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "src/app/showcase",
          status: "KEEP",
          ownerPhase: 5,
        }),
        expect.objectContaining({
          path: "src/app/jeepwork",
          status: "KEEP",
          ownerPhase: 1,
        }),
        expect.objectContaining({
          path: "src/app/workbench",
          status: "MIGRATING",
          ownerPhase: 2,
        }),
        expect.objectContaining({
          path: "src/app/api",
          status: "MIGRATING",
          ownerPhase: 1,
        }),
        expect.objectContaining({
          path: "src/components/share",
          status: "MIGRATING",
          ownerPhase: 2,
        }),
        expect.objectContaining({
          path: "src/lib/ai",
          status: "MIGRATING",
          ownerPhase: 3,
        }),
      ]),
    );
  });
});
