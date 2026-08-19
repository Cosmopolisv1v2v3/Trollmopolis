"use server";

import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export async function updateGuildSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const guildId = String(formData.get("guild_id"));
  const name = String(formData.get("albion_guild_name") || "").trim();
  const welcome = String(formData.get("welcome_message") || "").trim();

  const { error } = await supabase.rpc("update_guild_settings_rpc", {
    p_guild_id: guildId,
    p_albion_guild_name: name || null,
    p_welcome_message: welcome || null,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true, error: null };
}

export async function payUserAction(formData: FormData) {
  const supabase = await createClient();
  const discordId = String(formData.get("discord_id"));
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim();

  if (!discordId) return { ok: false, error: "Elegí un jugador." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "El monto debe ser mayor a 0." };
  if (reason.length < 3) return { ok: false, error: "El motivo es obligatorio (mín. 3 caracteres)." };

  const { data, error } = await supabase.rpc("pay_user_rpc", {
    p_discord_id: discordId,
    p_amount: Math.round(amount),
    p_reason: reason,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true, error: null, data };
}