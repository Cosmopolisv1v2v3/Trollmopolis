import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/signout — cierra sesión y vuelve al inicio. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(request.url).origin));
}