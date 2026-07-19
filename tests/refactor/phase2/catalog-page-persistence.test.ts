import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import {
  assertCatalogModuleKind,
  canPublishCatalogItem,
  parseCatalogItemKind,
  parseCatalogItemStatus,
  type CatalogItem,
} from "@/domains/catalog/catalog-item";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "prisma/migrations/20260720_catalog_page_module_authority/migration.sql",
);

function catalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return Object.freeze({
    id: crypto.randomUUID(),
    ownerUserId: crypto.randomUUID(),
    kind: "product",
    status: "draft",
    name: "Link168 产品",
    category: null,
    description: null,
    priceText: null,
    coverAssetId: null,
    legacyCoverUrl: null,
    ctaLabel: null,
    ctaUrl: null,
    sortOrder: 0,
    allowAiRecommendation: true,
    ...overrides,
  });
}

describe("Phase 2 CatalogItem domain persistence contract", () => {
  test("accepts only the approved kinds and statuses", () => {
    expect(parseCatalogItemKind("product")).toEqual({ ok: true, value: "product" });
    expect(parseCatalogItemKind("service")).toEqual({ ok: true, value: "service" });
    expect(parseCatalogItemKind("shop")).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "INVALID_CATALOG_ITEM_KIND" },
    });

    expect(parseCatalogItemStatus("draft")).toEqual({ ok: true, value: "draft" });
    expect(parseCatalogItemStatus("published")).toEqual({ ok: true, value: "published" });
    expect(parseCatalogItemStatus("archived")).toEqual({ ok: true, value: "archived" });
    expect(parseCatalogItemStatus("active")).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "INVALID_CATALOG_ITEM_STATUS" },
    });
  });

  test("allows a complete draft to be published and rejects archived or unnamed items", () => {
    expect(canPublishCatalogItem(catalogItem())).toEqual({ ok: true, value: true });
    expect(canPublishCatalogItem(catalogItem({ status: "archived" }))).toMatchObject({
      ok: false,
      error: { code: "CONFLICT", message: "CATALOG_ITEM_ARCHIVED" },
    });
    expect(canPublishCatalogItem(catalogItem({ name: "   " }))).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "CATALOG_ITEM_NAME_REQUIRED" },
    });
  });

  test("enforces Product and Service module kind compatibility", () => {
    expect(() => assertCatalogModuleKind("product-card", "product")).not.toThrow();
    expect(() => assertCatalogModuleKind("service-card", "service")).not.toThrow();
    expect(() => assertCatalogModuleKind("product-card", "service")).toThrow(
      "CATALOG_MODULE_KIND_MISMATCH",
    );
    expect(() => assertCatalogModuleKind("service-card", "product")).toThrow(
      "CATALOG_MODULE_KIND_MISMATCH",
    );
  });
});

describe("Phase 2 CatalogItem and PageModule migration", () => {
  test("backfills legacy state and installs authoritative foreign-key constraints", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for migration tests");

    const schemaName = `phase2_catalog_${crypto.randomUUID().replaceAll("-", "")}`;
    const quotedSchema = `"${schemaName}"`;
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      await client.query(`CREATE SCHEMA ${quotedSchema}`);
      await client.query(`SET search_path TO ${quotedSchema}, public`);
      await client.query(`
        CREATE TABLE "media_assets" (
          "id" UUID PRIMARY KEY
        );
        CREATE TABLE "products" (
          "id" UUID PRIMARY KEY,
          "is_active" BOOLEAN NOT NULL DEFAULT TRUE
        );
        CREATE TABLE "links" (
          "id" UUID PRIMARY KEY
        );
      `);

      const activeId = crypto.randomUUID();
      const inactiveId = crypto.randomUUID();
      await client.query(
        `INSERT INTO "products" ("id", "is_active") VALUES ($1, TRUE), ($2, FALSE)`,
        [activeId, inactiveId],
      );

      const migrationSql = await readFile(MIGRATION_PATH, "utf8");
      await client.query(migrationSql);

      const migrated = await client.query<{
        id: string;
        kind: string;
        status: string;
      }>(`SELECT "id", "kind", "status" FROM "products" ORDER BY "id"`);
      expect(migrated.rows).toEqual(
        expect.arrayContaining([
          { id: activeId, kind: "product", status: "published" },
          { id: inactiveId, kind: "product", status: "archived" },
        ]),
      );

      const removedLegacyColumn = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = 'products'
          AND column_name = 'is_active'
      `, [schemaName]);
      expect(removedLegacyColumn.rows[0]).toEqual({ count: "0" });

      const coverAssetId = crypto.randomUUID();
      await client.query(`INSERT INTO "media_assets" ("id") VALUES ($1)`, [coverAssetId]);
      await client.query(`UPDATE "products" SET "cover_asset_id" = $1 WHERE "id" = $2`, [coverAssetId, activeId]);
      await expect(
        client.query(`UPDATE "products" SET "cover_asset_id" = $1 WHERE "id" = $2`, [coverAssetId, inactiveId]),
      ).rejects.toMatchObject({ code: "23505" });

      const linkId = crypto.randomUUID();
      await client.query(`INSERT INTO "links" ("id", "catalog_item_id") VALUES ($1, $2)`, [linkId, activeId]);
      expect(
        (await client.query<{ catalogItemId: string | null; schemaVersion: number }>(
          `SELECT "catalog_item_id" AS "catalogItemId", "schema_version" AS "schemaVersion" FROM "links" WHERE "id" = $1`,
          [linkId],
        )).rows[0],
      ).toEqual({ catalogItemId: activeId, schemaVersion: 1 });

      await client.query(`DELETE FROM "products" WHERE "id" = $1`, [activeId]);
      expect(
        (await client.query<{ catalogItemId: string | null }>(
          `SELECT "catalog_item_id" AS "catalogItemId" FROM "links" WHERE "id" = $1`,
          [linkId],
        )).rows[0],
      ).toEqual({ catalogItemId: null });
    } finally {
      await client.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
      await client.end();
    }
  });
});
