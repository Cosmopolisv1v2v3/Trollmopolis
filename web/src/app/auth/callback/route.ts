import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

/**
 * GET /auth/callback — Supabase redirige acá tras el OAuth con Discord.
 * Intercambia el código, y (si el usuario está registrado en el bot)
 * vincula auth.users.id con users.auth_user_id usando el service role
 * SOLO en el servidor (nunca se expone al cliente).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const code = searchParams.get("code");
  const base = siteUrl() || new URL(request.url).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // --- vincular con el registro del bot ---
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const identity = user?.identities?.find((i) => i.provider === "discord");
        const discordId = String(identity?.id ?? "");
        if (discordId) {
          const service = await createServiceClient();
          await service
            .from("users")
            .update({ auth_user_id: user!.id, updated_at: new Date().toISOString() })
            .eq("discord_id", discordId);
        }
      } catch (e) {
        console.error("No pude vincular el login con el registro del bot:", e);
      }
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=${encodeURIComponent("No se pudo completar el login con Discord. Avisá a un administrador.")}`)
}