from pathlib import Path

schema_path = Path("prisma/schema.prisma")
text = schema_path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    "  enterpriseQuotaConsumptions EnterpriseQuotaConsumption[]\n\n  @@map(\"users\")",
    "  enterpriseQuotaConsumptions EnterpriseQuotaConsumption[]\n  mediaAssets                 MediaAsset[]\n\n  @@map(\"users\")",
    "user media assets relation",
)

replace_once(
    "  avatarUrl                  String?          @map(\"avatar_url\")\n  avatarModerationStatus     String           @default(\"legacy_approved\") @map(\"avatar_moderation_status\")",
    "  avatarUrl                  String?          @map(\"avatar_url\")\n  avatarAssetId             String?          @unique @map(\"avatar_asset_id\") @db.Uuid\n  avatarModerationStatus     String           @default(\"legacy_approved\") @map(\"avatar_moderation_status\")",
    "profile avatar asset id",
)

replace_once(
    "  aiConversations            AiConversation[]\n  visits                     ProfileVisit[]\n\n  @@map(\"profiles\")",
    "  aiConversations            AiConversation[]\n  visits                     ProfileVisit[]\n  avatarAsset               MediaAsset?      @relation(\"CurrentProfileAvatar\", fields: [avatarAssetId], references: [id], onDelete: SetNull)\n  mediaAssets               MediaAsset[]     @relation(\"ProfileMediaAssets\")\n\n  @@map(\"profiles\")",
    "profile media relations",
)

media_model = '''model MediaAsset {
  id               String    @id @default(uuid()) @db.Uuid
  ownerUserId      String    @map("owner_user_id") @db.Uuid
  profileId        String?   @map("profile_id") @db.Uuid
  purpose          String
  storageProvider  String    @default("local") @map("storage_provider")
  storageKey       String    @unique @map("storage_key")
  originalName     String?   @map("original_name")
  mimeType         String    @map("mime_type")
  sizeBytes        Int       @map("size_bytes")
  checksumSha256   String    @map("checksum_sha256")
  status           String    @default("uploading")
  moderationReason String?   @map("moderation_reason")
  deletedAt        DateTime? @map("deleted_at") @db.Timestamptz(6)
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  owner            User      @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  profile          Profile?  @relation("ProfileMediaAssets", fields: [profileId], references: [id], onDelete: SetNull)
  currentAvatarFor Profile?  @relation("CurrentProfileAvatar")

  @@index([ownerUserId, purpose, status])
  @@index([profileId, purpose, status])
  @@map("media_assets")
}

'''

marker = "// ============================================\n// D2: Domain（域名绑定与解析）\n// ============================================\n"
replace_once(marker, media_model + marker, "media asset model insertion")

schema_path.write_text(text)
