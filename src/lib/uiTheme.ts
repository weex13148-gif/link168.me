export type UiThemeId = "fresh" | "vip" | "creator";

export const UI_THEME_STORAGE_KEY = "link168-ui-theme";

export const uiThemes: Array<{
  id: UiThemeId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "fresh",
    label: "A 清爽蓝白",
    shortLabel: "A",
    description: "蓝白 SaaS 风",
  },
  {
    id: "vip",
    label: "B 黑金高级",
    shortLabel: "B",
    description: "会员高级风",
  },
  {
    id: "creator",
    label: "C 年轻彩色",
    shortLabel: "C",
    description: "创作者彩色风",
  },
];

export function isUiThemeId(value: string | null): value is UiThemeId {
  return value === "fresh" || value === "vip" || value === "creator";
}
