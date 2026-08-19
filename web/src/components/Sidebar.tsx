"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { SignOutButton } from "./SignOutButton";
import { getRoleBadge } from "@/lib/utils";
import type { Profile } from "@/lib/data";
import Image from "next/image";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout" },
  { href: "/splits", label: "Splits", icon: "coins" },
  { href: "/top", label: "Top de Silver", icon: "trophy" },
];

export function Sidebar({
  open,
  onClose,
  isStaff,
  loggedIn,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  isStaff: boolean;
  loggedIn: boolean;
  profile: Profile | null;
}) {
  const pathname = usePathname();
  const role = getRoleBadge(profile);

  const items = isStaff
    ? [...NAV, { href: "/admin", label: "Admin", icon: "shield" as IconName }]
    : NAV;

  const logo = "/logo.png";
  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          onClick={onClose}
          aria-label="Cerrar menú"
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link
          href="/"
          className="brand-link flex-col"
          onClick={onClose}
          title="Ir al inicio"
        >
          <div className="">
            <Image
              src={logo}
              width={600}
              height={600}
              alt="Cosmopilos logo" // Siempre recomendado por accesibilidad
            />
          </div>
          <div className="">
            <span className="brand-name">Cosmopolis</span>
            <span className="brand-sub">Albion Online</span>
          </div>
        </Link>

        <nav className="nav">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
                onClick={onClose}
              >
                <span className="nav-ico">
                  <Icon name={item.icon} size={18} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="foot-note" title="Gremio Cosmopolis">
            <span>
              <Icon name="shield" size={15} />
            </span>
            Tesorería del gremio
          </div>
          {loggedIn && role && (
            <div className="foot-role">
              <span className={`role-dot ${role.key}`} />
              <span className={role.cls}>{role.label}</span>
            </div>
          )}
          <div className="sidebar-foot-actions">
            {loggedIn ? <SignOutButton /> : null}
          </div>
        </div>
      </aside>
    </>
  );
}
