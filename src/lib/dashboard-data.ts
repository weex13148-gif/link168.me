import crypto from "crypto";
import { db } from "@/lib/db";

export function toProfileDto(profile: {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  theme: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    theme: profile.theme,
    is_public: profile.isPublic,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}

export function toLinkDto(link: {
  id: string;
  profileId: string;
  title: string;
  url: string;
  description: string | null;
  iconUrl: string | null;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: link.id,
    profile_id: link.profileId,
    title: link.title,
    url: link.url,
    description: link.description,
    icon_url: link.iconUrl,
    position: link.position,
    is_active: link.isActive,
    created_at: link.createdAt.toISOString(),
    updated_at: link.updatedAt.toISOString(),
  };
}

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : "";
}

export function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function getDashboardData(userId: string) {
  const profile = await db.profile.findUnique({
    where: { userId },
    include: { links: { orderBy: { position: "asc" } } },
  });

  return {
    profile: profile ? toProfileDto(profile) : null,
    links: profile ? profile.links.map(toLinkDto) : [],
  };
}

export async function getOwnedProfile(userId: string) {
  return db.profile.findUnique({ where: { userId } });
}

export function newId() {
  return crypto.randomUUID();
}
