"use client";

import Link from "next/link";
import { Icon } from "../icons";
import { themeButtonInfo, useTheme } from "@/lib/theme-context";

export function HomeNav() {
  const { theme, toggle } = useTheme();
  const tInfo = themeButtonInfo(theme);

  return (
    <header className="home-nav bg-(--bg-3)/30 shadow-sm">
      <Link href="/" className="auth-brand">
        <span
          className="brand-icon"
          style={{ width: 30, height: 30, fontSize: 16 }}
        >
          🏰
        </span>
        Cosmopolis
      </Link>

      <nav className="home-nav-links">
        <Link href="/top">Top de Silver</Link>
        <Link href="/login">Splits</Link>
      </nav>

      <div className="home-nav-actions">
        <button
          className="icon-btn"
          onClick={toggle}
          title={tInfo.title}
          aria-label="Cambiar tema"
        >
          <Icon name={tInfo.icon} size={18} />
        </button>
        <div className="flex gap-2">
          <Link className="btn btn-gold btn-sm" href="/login">
            Iniciar sesión con Discord
          </Link>
        </div>
      </div>
    </header>
  );
}