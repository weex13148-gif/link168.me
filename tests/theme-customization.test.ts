import { normalizeCustomTheme, validateCustomTheme } from "@/components/theme/normalize";
import { BUILT_IN_WALLPAPERS } from "@/components/theme/wallpapers";

describe("public profile custom theme", () => {
  test("legacy JSON defaults to portrait and accepts zero gaps", () => {
    const result = normalizeCustomTheme(null, JSON.stringify({ moduleGap: 0 }));

    expect(result.avatarMode).toBe("portrait");
    expect(result.moduleGap).toBe(0);
  });

  test("invalid ranges and avatar mode are deterministic", () => {
    const result = validateCustomTheme({
      cardOpacity: 101,
      buttonRadius: -1,
      moduleGap: 40,
      avatarMode: "banner",
    });

    expect(result.sanitized.cardOpacity).toBe(100);
    expect(result.sanitized.buttonRadius).toBe(0);
    expect(result.sanitized.moduleGap).toBe(32);
    expect(result.sanitized.avatarMode).toBe("portrait");
  });

  test("logo mode survives stored theme normalization", () => {
    const result = normalizeCustomTheme(
      null,
      JSON.stringify({ avatarMode: "logo" }),
    );

    expect(result.avatarMode).toBe("logo");
  });

  test("six project-owned wallpapers use local webp paths", () => {
    expect(BUILT_IN_WALLPAPERS).toHaveLength(6);
    for (const item of BUILT_IN_WALLPAPERS) {
      expect(item.src).toMatch(/^\/wallpapers\/[a-z-]+\.webp$/);
      const theme = normalizeCustomTheme(
        null,
        JSON.stringify({
          backgroundType: "image",
          backgroundValue: item.src,
        }),
      );
      expect(theme.backgroundValue).toBe(item.src);
    }
  });
});
