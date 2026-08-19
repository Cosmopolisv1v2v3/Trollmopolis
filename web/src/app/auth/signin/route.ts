import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { friendlyError } from "@/lib/errors";

/** POST /auth/signin — inicia OAuth con Discord y redirige. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const base = siteUrl() || new URL(request.url).origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(friendlyError(error.message))}`
    );
  }

  return NextResponse.redirect(data.url);
}