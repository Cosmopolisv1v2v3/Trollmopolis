import { NextResponse } from "next/server";
import { lookupBalance } from "@/lib/data";

/**
 * GET /api/lookup?name=... — consulta pública de saldo por nombre de Albion.
 * Sin login. Usa la RPC lookup_balance_rpc (SECURITY DEFINER).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() || "";

  if (!name) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const result = await lookupBalance(name);
  return NextResponse.json(result || { found: false });
}