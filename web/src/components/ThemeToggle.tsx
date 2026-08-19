"use client";

import { Icon } from "./icons";
import { themeButtonInfo, useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const tInfo = themeButtonInfo(theme);
  return (
    <button
      className="icon-btn"
      onClick={toggle}
      title={tInfo.title}
      aria-label="Cambiar tema"
    >
      <Icon name={tInfo.icon} size={18} />
    </button>
  );
}