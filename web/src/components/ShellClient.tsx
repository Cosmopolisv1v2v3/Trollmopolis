"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { Profile } from "@/lib/data";

/* Rutas sin el shell (páginas públicas y de autenticación con su propia cabecera) */
const STANDALONE = ["/", "/login"];

export function ShellClient({
  user,
  profile,
  isStaff,
  children,
}: {
  user: { email?: string | null } | null;
  profile: Profile | null;
  isStaff: boolean;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const apply = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setNavOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => setNavOpen(false), 0);
    return () => clearTimeout(t);
  }, [pathname, isMobile]);

  if (STANDALONE.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  return (
    <div className={`app ${navOpen ? "" : "sidebar-collapsed"}`}>
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(true)}
        isStaff={isStaff}
        loggedIn={Boolean(user)}
        profile={profile}
      />
      <div className="main-col">
        <Topbar onNavOpen={() => setNavOpen((o) => !o)} isStaff={isStaff} userEmail={user?.email ?? null} profile={profile} loggedIn={Boolean(user)} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}