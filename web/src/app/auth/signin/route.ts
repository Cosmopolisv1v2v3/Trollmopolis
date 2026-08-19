import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/signin — inicia OAuth con Discord y redirige. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${new URL(request.url).origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return NextResponse.redirect(
      `${new URL(request.url).origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(data.url);
}