function formatWithDots(n: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + s;
}

/** 1234567 -> "1.234.567" */
export function fmtSilver(n: number | null | undefined): string {
  return formatWithDots(Number(n || 0));
}

/** 123000000 -> "123 M" ; 4700000000 -> "4,7 B" */
export function fmtFame(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 2 })} B`;
  if (n >= 1e6) return `${Math.round(n / 1e6).toLocaleString("es-AR")} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString("es-AR")} K`;
  return `${n}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(iso));
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
  return `hace ${days} d`;
}

export function fmtMontoSigned(n: number): string {
  return `${n >= 0 ? "+" : "-"}${formatWithDots(Math.abs(n))}`;
}

export function shortId(uuid: string | null | undefined): string {
  return uuid ? uuid.slice(0, 6).toUpperCase() : "?";
}

export const FAME_TIERS: { min: number; max: number | null; label: string; color: string }[] = [
  { label: "Novato", min: 0, max: 50_000_000, color: "#a1a1aa" },
  { label: "Miembro Activo", min: 50_000_000, max: 150_000_000, color: "#2ecc71" },
  { label: "Veterano", min: 150_000_000, max: 500_000_000, color: "#3498db" },
  { label: "Élite", min: 500_000_000, max: 1_500_000_000, color: "#9b59b6" },
  { label: "Leyenda", min: 1_500_000_000, max: 4_000_000_000, color: "#e67e22" },
  { label: "Mítico", min: 4_000_000_000, max: null, color: "#e74c3c" },
];