export type BackgroundType = "solid" | "gradient" | "image";

export type CardStyle = "solid" | "glass" | "outline";

export type ButtonStyle = "solid" | "outline" | "soft";

export type AvatarFrame = "circle" | "square" | "rounded" | "ring";

export interface CustomTheme {
  backgroundType: BackgroundType;
  backgroundValue: string;
  textColor: string;
  cardStyle: CardStyle;
  cardOpacity: number;
  buttonStyle: ButtonStyle;
  buttonRadius: number;
  avatarFrame: AvatarFrame;
  moduleGap: number;
}

export const defaultCustomTheme: CustomTheme = {
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
