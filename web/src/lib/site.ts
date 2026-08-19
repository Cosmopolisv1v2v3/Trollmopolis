/**
 * URL pública base del sitio.
 * En producción (Railway/Vercel) configurar NEXT_PUBLIC_SITE_URL
 * para que los redirects de auth no dependan del Host header del proxy.
 * IMPORTANTE: no debe terminar en "/".
 */
export function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  return "";
}