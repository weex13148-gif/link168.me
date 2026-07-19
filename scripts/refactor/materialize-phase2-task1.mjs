import fs from "node:fs";

const schemaPath = "prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("coverAssetId          String?")) {
  console.log("PHASE2_TASK1_SCHEMA_ALREADY_MATERIALIZED");
  process.exit(0);
}

const replacements = [
  [
    '  currentAvatarFor Profile?  @relation("CurrentProfileAvatar")\n',
    '  currentAvatarFor       Profile? @relation("CurrentProfileAvatar")\n' +
      '  currentCatalogCoverFor Product? @relation("CatalogCoverAsset")\n',
  ],
  [
    '  payloadJson          String?     @map("payload_json")\n',
    '  payloadJson          String?     @map("payload_json")\n' +
      '  catalogItemId        String?     @map("catalog_item_id") @db.Uuid\n' +
      '  schemaVersion        Int         @default(1) @map("schema_version")\n',
  ],
  [
    '  profile              Profile     @relation(fields: [profileId], references: [id], onDelete: Cascade)\n' +
      '  clicks               LinkClick[]\n\n' +
      '  @@index([profileId, type])\n',
    '  profile              Profile     @relation(fields: [profileId], references: [id], onDelete: Cascade)\n' +
      '  catalogItem          Product?    @relation(fields: [catalogItemId], references: [id], onDelete: SetNull)\n' +
      '  clicks               LinkClick[]\n\n' +
      '  @@index([profileId, type])\n' +
      '  @@index([catalogItemId])\n',
  ],
  [
    `model Product {
  id                    String   @id @default(uuid()) @db.Uuid
  userId                String   @map("user_id") @db.Uuid
  name                  String
  category              String?
  description           String?
  priceText             String?  @map("price_text")
  coverImageUrl         String?  @map("cover_image_url")
  ctaLabel              String?  @map("cta_label")
  ctaUrl                String?  @map("cta_url")
  sortOrder             Int      @default(0) @map("sort_order")
  isActive              Boolean  @default(true) @map("is_active")
  allowAiRecommendation Boolean  @default(true) @map("allow_ai_recommendation")
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  leads                 Lead[]

  @@index([userId, isActive, sortOrder])
  @@index([userId, category])
  @@map("products")
}
`,
    `model Product {
  id                    String      @id @default(uuid()) @db.Uuid
  userId                String      @map("user_id") @db.Uuid
  kind                  String      @default("product")
  status                String      @default("draft")
  name                  String
  category              String?
  description           String?
  priceText             String?     @map("price_text")
  coverImageUrl         String?     @map("cover_image_url")
  coverAssetId          String?     @unique @map("cover_asset_id") @db.Uuid
  ctaLabel              String?     @map("cta_label")
  ctaUrl                String?     @map("cta_url")
  sortOrder             Int         @default(0) @map("sort_order")
  allowAiRecommendation Boolean     @default(true) @map("allow_ai_recommendation")
  archivedAt            DateTime?   @map("archived_at") @db.Timestamptz(6)
  createdAt             DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)
  user                  User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  coverAsset            MediaAsset? @relation("CatalogCoverAsset", fields: [coverAssetId], references: [id], onDelete: SetNull)
  leads                 Lead[]
  pageModules           Link[]

  @@index([userId, status, sortOrder])
  @@index([userId, category])
  @@map("products")
}
`,
  ],
];

for (const [before, after] of replacements) {
  const first = schema.indexOf(before);
  const last = schema.lastIndexOf(before);
  if (first < 0 || first !== last) {
    throw new Error(`PHASE2_TASK1_SCHEMA_MATCH_ERROR count=${first < 0 ? 0 : 2} snippet=${before.slice(0, 80)}`);
  }
  schema = schema.replace(before, after);
}

fs.writeFileSync(schemaPath, schema);
console.log("PHASE2_TASK1_SCHEMA_MATERIALIZED");
