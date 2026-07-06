import {
  type CustomTheme,
  type BackgroundType,
  type CardStyle,
  type ButtonStyle,
  type AvatarFrame,
  defaultCustomTheme,
} from "./types";
import {
  presetThemesV2,
  defaultThemeNameV2,
  mapLegacyThemeNameToV2,
} from "./presetThemes";

const VALID_BACKGROUND_TYPES: BackgroundType[] = ["solid", "gradient", "image"];
const VALID_CARD_STYLES: CardStyle[] = ["solid", "glass", "outline"];
const VALID_BUTTON_STYLES: ButtonStyle[] = ["solid", "outline", "soft"];
const VALID_AVATAR_FRAMES: AvatarFrame[] = ["circle", "square", "rounded", "ring"];

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const RGB_COLOR_RE = /^rgb(a)?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+\s*)?\)$/i;
const GRADIENT_RE = /^linear-gradient\(|^radial-gradient\(|^conic-gradient\(/i;
const URL_RE = /^url\(['"]?(https?:\/\/[^'")]+)['"]?\)$/i;
const HTTP_URL_RE = /^https?:\/\/.+/i;

function isValidColor(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (HEX_COLOR_RE.test(v)) return true;
  if (RGB_COLOR_RE.test(v)) return true;
  if (v.startsWith("hsl(") || v.startsWith("hsla(")) return true;
  const namedColors = new Set([
    "white", "black", "red", "green", "blue", "yellow", "orange", "purple",
    "pink", "gray", "grey", "brown", "cyan", "magenta", "lime", "maroon",
    "navy", "olive", "teal", "aqua", "silver", "gold", "beige", "ivory",
    "transparent", "currentColor", "inherit",
  ]);
  if (namedColors.has(v.toLowerCase())) return true;
  return false;
}

function isValidBackgroundValue(type: BackgroundType, value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  switch (type) {
    case "solid":
      return isValidColor(v);
    case "gradient":
      return GRADIENT_RE.test(v);
    case "image":
      return URL_RE.test(v) || HTTP_URL_RE.test(v);
    default:
      return false;
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

export function validateCustomTheme(obj: unknown): {
  valid: boolean;
  sanitized: CustomTheme;
  errors: string[];
} {
  const errors: string[] = [];
  const result: CustomTheme = { ...defaultCustomTheme };

  if (!obj || typeof obj !== "object") {
    errors.push("input is not an object");
    return { valid: false, sanitized: result, errors };
  }

  const input = obj as Record<string, unknown>;

  if ("backgroundType" in input) {
    const v = input.backgroundType;
    if (typeof v === "string" && VALID_BACKGROUND_TYPES.includes(v as BackgroundType)) {
      result.backgroundType = v as BackgroundType;
    } else {
      errors.push("backgroundType is invalid");
    }
  }

  if ("backgroundValue" in input) {
    const v = input.backgroundValue;
    if (typeof v === "string" && isValidBackgroundValue(result.backgroundType, v)) {
      result.backgroundValue = v.trim();
    } else {
      errors.push("backgroundValue is invalid");
    }
  }

  if ("textColor" in input) {
    const v = input.textColor;
    if (typeof v === "string" && isValidColor(v)) {
      result.textColor = v.trim();
    } else {
      errors.push("textColor is invalid");
    }
  }

  if ("cardStyle" in input) {
    const v = input.cardStyle;
    if (typeof v === "string" && VALID_CARD_STYLES.includes(v as CardStyle)) {
      result.cardStyle = v as CardStyle;
    } else {
      errors.push("cardStyle is invalid");
    }
  }

  if ("cardOpacity" in input) {
    const v = input.cardOpacity;
    if (typeof v === "number") {
      result.cardOpacity = clampNumber(v, 0, 100, defaultCustomTheme.cardOpacity);
      if (v < 0 || v > 100) errors.push("cardOpacity out of range");
    } else {
      errors.push("cardOpacity is invalid");
    }
  }

  if ("buttonStyle" in input) {
    const v = input.buttonStyle;
    if (typeof v === "string" && VALID_BUTTON_STYLES.includes(v as ButtonStyle)) {
      result.buttonStyle = v as ButtonStyle;
    } else {
      errors.push("buttonStyle is invalid");
    }
  }

  if ("buttonRadius" in input) {
    const v = input.buttonRadius;
    if (typeof v === "number") {
      result.buttonRadius = clampNumber(v, 0, 32, defaultCustomTheme.buttonRadius);
      if (v < 0 || v > 32) errors.push("buttonRadius out of range");
    } else {
      errors.push("buttonRadius is invalid");
    }
  }

  if ("avatarFrame" in input) {
    const v = input.avatarFrame;
    if (typeof v === "string" && VALID_AVATAR_FRAMES.includes(v as AvatarFrame)) {
      result.avatarFrame = v as AvatarFrame;
    } else {
      errors.push("avatarFrame is invalid");
    }
  }

  if ("moduleGap" in input) {
    const v = input.moduleGap;
    if (typeof v === "number") {
      result.moduleGap = clampNumber(v, 8, 32, defaultCustomTheme.moduleGap);
      if (v < 8 || v > 32) errors.push("moduleGap out of range");
    } else {
      errors.push("moduleGap is invalid");
    }
  }

  return {
    valid: errors.length === 0,
    sanitized: result,
    errors,
  };
}

export function getPresetTheme(name: string): CustomTheme | undefined {
  if (!name) return undefined;
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const direct = presetThemesV2[trimmed as keyof typeof presetThemesV2];
  if (direct) return direct;
  const mappedName = mapLegacyThemeNameToV2(trimmed);
  if (mappedName) {
    return presetThemesV2[mappedName];
  }
  return undefined;
}

export function normalizeCustomTheme(
  themeName: string | null,
  customThemeStr: string | null,
): CustomTheme {
  if (customThemeStr) {
    try {
      const parsed = JSON.parse(customThemeStr);
      const { sanitized } = validateCustomTheme(parsed);
      return sanitized;
    } catch {
      // JSON parse failed, fall through to themeName
    }
  }

  if (themeName) {
    const preset = getPresetTheme(themeName);
    if (preset) {
      return preset;
    }
  }

  return getPresetTheme(defaultThemeNameV2) || defaultCustomTheme;
}
