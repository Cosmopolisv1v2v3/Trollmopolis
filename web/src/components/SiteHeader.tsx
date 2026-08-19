"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { LogoImage } from "./logo";
import { getRoleBadge } from "@/lib/utils";
import type { Profile } from "@/lib/data";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout" },
  { href: "/splits", label: "Splits", icon: "coins" },
  { href: "/top", label: "Top de Silver", icon: "trophy" },
];

export function SiteHeader({
  profile,
  isStaff,
  loggedIn,
}: {
  profile: Profile | null;
  isStaff: boolean;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const role = getRoleBadge(profile);
  const items = isStaff
    ? [...NAV, { href: "/admin", label: "Admin", icon: "shield" as IconName }]
    : NAV;

  return (
    <header className="site-header">
      <Link href="/" className="site-brand" title="Ir al inicio">
        <span className="site-logo">
          <LogoImage w={40} h={40} />
        </span>
        <span className="site-brand-name">Cosmopolis</span>
      </Link>

      <nav className="site-nav" aria-label="Secciones">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`site-link ${active ? "active" : ""}`}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="site-actions">
        {loggedIn && role && (
          <span className={`site-role hidden sm:inline-flex ${role.cls}`}>
            {role.label}
          </span>
        )}
        <ThemeToggle />
        {loggedIn ? (
          <SignOutButton />
        ) : pathname !== "/login" ? (
          <Link className="btn btn-gold btn-sm" href="/login">
            Iniciar sesión
          </Link>
        ) : null}
      </div>
    </header>
  );
}