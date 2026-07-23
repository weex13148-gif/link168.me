export type PublicProfileRenderMode = "public" | "preview";

export type PublicProfileIdentity = {
  profileId?: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  contactVisibility?: string;
};
