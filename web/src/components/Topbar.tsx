"use client";

import { Icon } from "./icons";
import { themeButtonInfo, useTheme } from "@/lib/theme-context";
import { SignOutButton } from "./SignOutButton";
import { getRoleBadge, type RoleBadge } from "@/lib/utils";
import type { Profile } from "@/lib/data";

export function Topbar({
  onNavOpen,
  isStaff,
  profile,
  loggedIn,
}: {
  onNavOpen: () => void;
  isStaff: boolean;
  userEmail: string | null;
  profile: Profile | null;
  loggedIn: boolean;
}) {
  const { theme, toggle } = useTheme();
  const tInfo = themeButtonInfo(theme);
  const name =
    profile?.display_nick || profile?.albion_name || null;
  const role: RoleBadge | null = getRoleBadge(profile);

  return (
    <header className="topbar">
      <button className="icon-btn nav-toggle" onClick={onNavOpen} title="Abrir / cerrar menú" aria-label="Abrir o cerrar menú">
        <Icon name="menu" size={20} />
      </button>

      <span className="topbar-spacer" />

      {name && (
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-[var(--text-2)] hidden sm:inline truncate">
            {name}
          </span>
          {loggedIn && role && (
            <span className={`hidden sm:inline-flex text-xs font-bold uppercase tracking-wide ${role.cls}`}>
              ({role.label})
            </span>
          )}
        </span>
      )}

      <button className="icon-btn" onClick={toggle} title={tInfo.title} aria-label="Cambiar tema">
        <Icon name={tInfo.icon} size={18} />
      </button>

      {isStaff ? (
        <LinkNative href="/admin">
          <Icon name="gear" size={18} />
        </LinkNative>
      ) : null}

      {loggedIn ? <SignOutButton /> : null}
    </header>
  );
}

import Link from "next/link";

function LinkNative({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="icon-btn" title="Admin" aria-label="Admin">
      {children}
    </Link>
  );
}