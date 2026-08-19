"use server";

import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export async function createSplitAction(formData: FormData) {
  const supabase = await createClient();
  const total = Number(formData.get("total"));
  const tax = Number(formData.get("tax") || 0);
  const location = String(formData.get("location") || "").trim();
  const participants = String(formData.get("participants") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!Number.isFinite(total) || total <= 0) return { ok: false, error: "El monto debe ser mayor a 0." };
  if (participants.length === 0) return { ok: false, error: "Elegí al menos un participante." };
  if (participants.length > 50) return { ok: false, error: "Máximo 50 participantes." };
  if (tax < 0 || tax > 100) return { ok: false, error: "El impuesto debe estar entre 0 y 100." };

  const { data, error } = await supabase.rpc("create_split_rpc", {
    p_total_amount: total,
    p_tax_percent: tax,
    p_loot_location: location || null,
    p_participants: participants,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true, error: null, data };
}

export async function adjustSplitAction(formData: FormData) {
  const supabase = await createClient();
  const splitId = String(formData.get("split_id"));
  const discordId = String(formData.get("user_id"));
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim();

  if (!discordId) return { ok: false, error: "Falta el usuario." };
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "El monto no puede ser 0." };
  if (reason.length < 3) return { ok: false, error: "El motivo es obligatorio (mín. 3 caracteres)." };

  const { error } = await supabase.rpc("adjust_split_rpc", {
    p_split_id: splitId,
    p_discord_id: discordId,
    p_amount_delta: amount,
    p_reason: reason,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true, error: null };
}

/** Paga un split completo (tesorero/admin): descuenta a cada participante. */
export async function paySplitCompleteAction(formData: FormData) {
  const supabase = await createClient();
  const splitId = String(formData.get("split_id"));
  if (!splitId) return { ok: false, error: "Falta el split." };

  const { data, error } = await supabase.rpc("pay_split_complete_rpc", {
    p_split_id: splitId,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  const d = data as { total?: number; participants?: number } | undefined;
  return {
    ok: true,
    error: null,
    data: d || {},
  };
}

export interface VoiceMember {
  discord_id: string;
  tag: string;
  display_name: string;
}

export interface VoiceChannelInfo {
  id: string;
  name: string;
  members: VoiceMember[];
}

/**
 * Consulta al bot (endpoint HTTP /api/voice) quiénes están conectados a los
 * canales de voz del gremio. El bot valida con BOT_API_SECRET (server-side).
 */
export async function getVoiceChannelsAction(guildId: string) {
  const base = process.env.BOT_INTERNAL_URL?.trim();
  const secret = process.env.BOT_API_SECRET?.trim();
  if (!base || !secret) {
    return { ok: false, error: "El bot no tiene el endpoint de voz configurado.", channels: [] as VoiceChannelInfo[] };
  }

  try {
    const res = await fetch(`${base}/api/voice?guildId=${encodeURIComponent(guildId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `El bot respondió ${res.status}.`, channels: [] as VoiceChannelInfo[] };
    }
    const data = (await res.json()) as { channels: VoiceChannelInfo[] };
    return { ok: true, error: null, channels: data.channels || [] };
  } catch {
    return { ok: false, error: "No se pudo conectar con el bot.", channels: [] as VoiceChannelInfo[] };
  }
}