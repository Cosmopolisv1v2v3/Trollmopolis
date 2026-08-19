import { fmtSilver } from "./format";
import type { Profile } from "./data";

/* ---------- Formato ---------- */
export function fmtInt(n: number | null | undefined): string {
  return fmtSilver(Number(n) || 0);
}

/** Rango derivado de los flags sincronizados por el bot (prioridad de mayor a menor). */
export interface RoleBadge {
  label: string;
  key: "admin" | "treasurer" | "splits_manager" | "member";
  cls: string;
}

export function getRoleBadge(
  profile: Pick<Profile, "is_admin" | "is_treasurer" | "is_splits_manager"> | null
): RoleBadge | null {
  if (!profile) return null;
  if (profile.is_admin) return { label: "Admin", key: "admin", cls: "text-[var(--red)]" };
  if (profile.is_treasurer) return { label: "Tesorero", key: "treasurer", cls: "text-[var(--gold)]" };
  if (profile.is_splits_manager) return { label: "Splits", key: "splits_manager", cls: "text-[var(--green)]" };
  return { label: "Miembro", key: "member", cls: "text-[var(--text-3)]" };
}

export function fmtMoney(n: number | null | undefined): string {
  return fmtSilver(Number(n) || 0);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} d`;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(iso));
}

/* Medallas del podio */
export const MEDALS = ["🥇", "🥈", "🥉"];

/* ---------- Varios ---------- */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* Color determinista por nombre para avatares */
const AV_COLORS: [string, string][] = [
  ["#b8862a", "#f0c75e"],
  ["#7d5bd6", "#b39af5"],
  ["#2f7ec1", "#8fc6f5"],
  ["#1f9d7a", "#7fe0c2"],
  ["#c14f4f", "#f5a3a3"],
  ["#c1784f", "#f5cfa3"],
  ["#4f7cc1", "#a3c4f5"],
  ["#9d5bb0", "#d4a3e8"],
  ["#5b8f4f", "#b4dba3"],
  ["#b0547d", "#f5a3c4"],
];

export function avatarColors(name: string): [string, string] {
  let h = 0;
  const s = String(name || "?");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export function initialOf(name: string): string {
  return String(name || "?").charAt(0).toUpperCase();
}