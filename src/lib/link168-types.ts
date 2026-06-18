export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: string;
  language: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileLink = {
  id: string;
  profile_id: string;
  title: string;
  url: string;
  description: string | null;
  icon_type: string;
  icon_value: string | null;
  icon_url: string | null;
  position: number;
  is_active: boolean;
  total_clicks: number;
  created_at: string;
  updated_at: string;
};
