import type { CustomTheme } from "./types";

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

export type PresetThemeNameV2 =
  | "草木原色"
  | "简约白"
  | "商务黑"
  | "蓝色科技"
  | "橙色活力"
  | "浅绿清新"
  | "夜樱粉"
  | "日落橙"
  | "海洋蓝"
  | "森林绿"
  | "极简灰"
  | "暖茶棕";

const themeV2NaturalGreen: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #DDE8CD 0%, #F7F1E7 100%)",
  textColor: "#2B241E",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 16,
  avatarFrame: "circle",
  moduleGap: 8,
};

const themeV2PureWhite: CustomTheme = {
  backgroundType: "solid",
  backgroundValue: "#FFFFFF",
  textColor: "#2B241E",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "outline",
  buttonRadius: 12,
  avatarFrame: "circle",
  moduleGap: 12,
};

const themeV2BusinessBlack: CustomTheme = {
  backgroundType: "solid",
  backgroundValue: "#111827",
  textColor: "#F9FAFB",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 12,
  avatarFrame: "ring",
  moduleGap: 12,
};

const themeV2BlueTech: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(180deg, #EAF3FF 0%, #DBEAFE 100%)",
  textColor: "#0F172A",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 14,
  avatarFrame: "circle",
  moduleGap: 10,
};

const themeV2OrangeVibrant: CustomTheme = {
  backgroundType: "solid",
  backgroundValue: "#FFF3E6",
  textColor: "#4A1C06",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 16,
  avatarFrame: "rounded",
  moduleGap: 10,
};

const themeV2MintFresh: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #DDE8CD 0%, #C7DDB5 100%)",
  textColor: "#2B241E",
  cardStyle: "glass",
  cardOpacity: 90,
  buttonStyle: "soft",
  buttonRadius: 16,
  avatarFrame: "circle",
  moduleGap: 8,
};

const themeV2NightCherry: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #FFF0F5 0%, #FFE4EC 100%)",
  textColor: "#4A0E3F",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 20,
  avatarFrame: "circle",
  moduleGap: 12,
};

const themeV2SunsetOrange: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(180deg, #FF7E5F 0%, #FEB47B 100%)",
  textColor: "#2D1B0E",
  cardStyle: "glass",
  cardOpacity: 85,
  buttonStyle: "soft",
  buttonRadius: 20,
  avatarFrame: "ring",
  moduleGap: 12,
};

const themeV2OceanBlue: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(180deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
  textColor: "#F0F9FF",
  cardStyle: "glass",
  cardOpacity: 75,
  buttonStyle: "outline",
  buttonRadius: 14,
  avatarFrame: "ring",
  moduleGap: 10,
};

const themeV2ForestGreen: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
  textColor: "#F0FDF4",
  cardStyle: "glass",
  cardOpacity: 80,
  buttonStyle: "solid",
  buttonRadius: 16,
  avatarFrame: "rounded",
  moduleGap: 10,
};

const themeV2MinimalGray: CustomTheme = {
  backgroundType: "solid",
  backgroundValue: "#F3F4F6",
  textColor: "#1F2937",
  cardStyle: "outline",
  cardOpacity: 100,
  buttonStyle: "outline",
  buttonRadius: 8,
  avatarFrame: "square",
  moduleGap: 16,
};

const themeV2WarmTeaBrown: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #F5E6D3 0%, #E8D5B7 100%)",
  textColor: "#3E2723",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 12,
  avatarFrame: "rounded",
  moduleGap: 12,
};

export const presetThemesV2: Record<PresetThemeNameV2, CustomTheme> = {
  "草木原色": themeV2NaturalGreen,
  "简约白": themeV2PureWhite,
  "商务黑": themeV2BusinessBlack,
  "蓝色科技": themeV2BlueTech,
  "橙色活力": themeV2OrangeVibrant,
  "浅绿清新": themeV2MintFresh,
  "夜樱粉": themeV2NightCherry,
  "日落橙": themeV2SunsetOrange,
  "海洋蓝": themeV2OceanBlue,
  "森林绿": themeV2ForestGreen,
  "极简灰": themeV2MinimalGray,
  "暖茶棕": themeV2WarmTeaBrown,
};

export const defaultThemeNameV2: PresetThemeNameV2 = "草木原色";

export function getPresetThemeV2(name: string): CustomTheme | undefined {
  const trimmed = (name || "").trim();
  return presetThemesV2[trimmed as PresetThemeNameV2];
}

export function listPresetThemeNamesV2(): string[] {
  return Object.keys(presetThemesV2);
}

const themeNameMap: Record<string, PresetThemeNameV2> = {
  "Link168 草木默认": "草木原色",
  "简约白": "简约白",
  "商务黑": "商务黑",
  "蓝色科技": "蓝色科技",
  "橙色活力": "橙色活力",
  "浅绿清新": "浅绿清新",
  "夜樱粉": "夜樱粉",
};

export function mapLegacyThemeNameToV2(legacyName: string): PresetThemeNameV2 | undefined {
  const trimmed = (legacyName || "").trim();
  return themeNameMap[trimmed];
}

export const FREE_THEME_NAMES_V2: PresetThemeNameV2[] = ["草木原色", "简约白"];

export const PAID_THEME_NAMES_V2: PresetThemeNameV2[] = [
  "商务黑", "蓝色科技", "橙色活力", "浅绿清新", "夜樱粉",
  "日落橙", "海洋蓝", "森林绿", "极简灰", "暖茶棕",
];

export function isFreeThemeV2(name: string): boolean {
  const trimmed = (name || "").trim();
  return FREE_THEME_NAMES_V2.includes(trimmed as PresetThemeNameV2);
}
