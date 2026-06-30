"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { isUiThemeId, UI_THEME_STORAGE_KEY, uiThemes, type UiThemeId } from "@/lib/uiTheme";

export function UiThemeSwitcher() {
  const [theme, setTheme] = useState<UiThemeId>(() => {
    if (typeof window === "undefined") return "fresh";
    const storedTheme = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiThemeId(storedTheme) ? storedTheme : "fresh";
  });

  useEffect(() => {
    document.documentElement.dataset.link168UiTheme = theme;
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
  }, [theme]);

  function chooseTheme(nextTheme: UiThemeId) {
    setTheme(nextTheme);
  }

  return (
    <aside className="link168-ui-switcher" aria-label="临时 UI 评测">
      <div className="link168-ui-switcher__title">
        <Palette aria-hidden />
        <span>临时 UI 评测</span>
      </div>
      <div className="link168-ui-switcher__options">
        {uiThemes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => chooseTheme(item.id)}
            className={theme === item.id ? "is-active" : ""}
            aria-pressed={theme === item.id}
            title={`${item.label}：${item.description}`}
          >
            <span>{item.shortLabel}</span>
            <small>{item.description}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
