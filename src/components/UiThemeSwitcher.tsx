"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { isUiThemeId, UI_THEME_STORAGE_KEY, uiThemes, type UiThemeId } from "@/lib/uiTheme";

export function UiThemeSwitcher() {
  const [theme, setTheme] = useState<UiThemeId>("fresh");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    const nextTheme = isUiThemeId(storedTheme) ? storedTheme : "fresh";
    setTheme(nextTheme);
    document.documentElement.dataset.link168UiTheme = nextTheme;
  }, []);

  function chooseTheme(nextTheme: UiThemeId) {
    setTheme(nextTheme);
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, nextTheme);
    document.documentElement.dataset.link168UiTheme = nextTheme;
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
