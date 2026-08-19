"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import type { Profile } from "@/lib/data";

/* La home y el login son páginas públicas con su propio hero; el resto usa el
 * contenedor con padding estándar debajo del header único. */
const SHELL_ROUTES = ["/dashboard", "/splits", "/top", "/admin"];

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
  const pathname = usePathname();
  const inShell = SHELL_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <div className="app site-shell">
      <SiteHeader loggedIn={Boolean(user)} profile={profile} isStaff={isStaff} />
      {inShell ? (
        <main className="content">{children}</main>
      ) : (
        <>{children}</>
      )}
    </div>
  );
}