export type ShareThemeClassSet = {
  surfaceClassName: string;
  cardClassName: string;
  linkClassName: string;
  avatarClassName: string;
  nameClassName: string;
  subClassName: string;
  footerClassName: string;
};

export type ShareThemeName =
  | "Link168 草木默认"
  | "简约白"
  | "商务黑"
  | "蓝色科技"
  | "橙色活力"
  | "浅绿清新"
  | "夜樱粉";

const baseDefault: ShareThemeClassSet = {
  surfaceClassName: "bg-[#F7F1E7]",
  cardClassName: "bg-[#FFFDF8] text-[#2B241E]",
  linkClassName:
    "bg-[#FFFDF8] border border-[#E8DCCB] text-[#2B241E] hover:bg-[#F7F1E7]",
  avatarClassName: "bg-[#DDE8CD] text-[#3F5F31]",
  nameClassName: "text-[#2B241E]",
  subClassName: "text-[#7A6D5E]",
  footerClassName: "text-[#7A6D5E]",
};

const themeWhite: ShareThemeClassSet = {
  surfaceClassName: "bg-white",
  cardClassName: "bg-white text-[#2B241E]",
  linkClassName:
    "bg-white border border-[#E0E0E0] text-[#2B241E] hover:bg-[#F5F7FA]",
  avatarClassName: "bg-[#F5F7FA] text-[#2B241E]",
  nameClassName: "text-[#2B241E]",
  subClassName: "text-[#7A6D5E]",
  footerClassName: "text-[#8C8C8C]",
};

const themeDark: ShareThemeClassSet = {
  surfaceClassName: "bg-[#111827]",
  cardClassName: "bg-[#1F2937] text-white",
  linkClassName:
    "bg-[#111827] border border-[#374151] text-white hover:bg-[#1F2937]",
  avatarClassName: "bg-[#374151] text-white",
  nameClassName: "text-white",
  subClassName: "text-[#D1D5DB]",
  footerClassName: "text-[#9CA3AF]",
};

const themeBlueTech: ShareThemeClassSet = {
  surfaceClassName: "bg-[#EAF3FF]",
  cardClassName: "bg-white text-[#0F172A]",
  linkClassName:
    "bg-[#2563EB] border border-[#1D4ED8] text-white hover:bg-[#1D4ED8]",
  avatarClassName: "bg-[#2563EB] text-white",
  nameClassName: "text-[#0F172A]",
  subClassName: "text-[#64748B]",
  footerClassName: "text-[#64748B]",
};

const themeOrange: ShareThemeClassSet = {
  surfaceClassName: "bg-[#FFF3E6]",
  cardClassName: "bg-white text-[#4A1C06]",
  linkClassName:
    "bg-[#F97316] border border-[#EA580C] text-white hover:bg-[#EA580C]",
  avatarClassName: "bg-[#F97316] text-white",
  nameClassName: "text-[#4A1C06]",
  subClassName: "text-[#9A3412]",
  footerClassName: "text-[#9A3412]",
};

const themeMintGreen: ShareThemeClassSet = {
  surfaceClassName: "bg-[#DDE8CD]",
  cardClassName: "bg-[#FFFDF8] text-[#2B241E]",
  linkClassName:
    "bg-[#FFFDF8] border border-[#E8DCCB] text-[#3F5F31] hover:bg-[#F7F1E7]",
  avatarClassName: "bg-[#6F8F4E] text-white",
  nameClassName: "text-[#2B241E]",
  subClassName: "text-[#4A5A2F]",
  footerClassName: "text-[#4A5A2F]",
};

const themeNightCherry: ShareThemeClassSet = {
  surfaceClassName: "bg-[#FFF0F5]",
  cardClassName: "bg-white text-[#4A0E3F]",
  linkClassName:
    "bg-gradient-to-r from-[#FF8DA1] to-[#FFB86B] border border-transparent text-white hover:opacity-90",
  avatarClassName: "bg-gradient-to-br from-[#FFB86B] to-[#FF8DA1] text-white",
  nameClassName: "text-[#4A0E3F]",
  subClassName: "text-[#9A345F]",
  footerClassName: "text-[#9A345F]",
};

export const presetThemes: Record<ShareThemeName, ShareThemeClassSet> = {
  "Link168 草木默认": baseDefault,
  "简约白": themeWhite,
  "商务黑": themeDark,
  "蓝色科技": themeBlueTech,
  "橙色活力": themeOrange,
  "浅绿清新": themeMintGreen,
  "夜樱粉": themeNightCherry,
};

export const defaultThemeName: ShareThemeName = "Link168 草木默认";

export function getThemeClasses(
  themeName: string | null | undefined,
): ShareThemeClassSet {
  const name = (themeName || "").trim() as ShareThemeName;
  if (name && name in presetThemes) {
    return presetThemes[name];
  }
  return presetThemes[defaultThemeName];
}

export function listThemeNames(): string[] {
  return Object.keys(presetThemes);
}
