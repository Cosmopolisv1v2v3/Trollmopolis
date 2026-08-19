"use client";

import Link from "next/link";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
    >
      {children}
    </Link>
  );
}