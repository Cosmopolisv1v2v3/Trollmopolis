import { createClient } from "@/lib/supabase/server";

export interface Profile {
  discord_id: string;
  guild_id: string | null;
  albion_id: string | null;
  albion_name: string | null;
  display_nick: string | null;
  member_type: "miembro" | "alianza" | null;
  kill_fame: number | null;
  death_fame: number | null;
  ip_average: number | null;
  guild_name_albion: string | null;
  fame_tier: string | null;
  is_admin: boolean;
  is_treasurer: boolean;
  is_splits_manager: boolean;
  registered_at: string | null;
  last_synced_at: string | null;
}

export interface Wallet {
  discord_id: string;
  guild_id: string;
  balance: number;
  updated_at: string;
}

export interface Split {
  id: string;
  guild_id: string;
  created_by: string;
  total_amount: number;
  tax_percent: number;
  net_amount: number;
  loot_location: string | null;
  status: "open" | "locked" | "cancelled";
  created_at: string;
  locked_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export interface Transaction {
  id: string;
  guild_id: string;
  from_discord_id: string | null;
  to_discord_id: string;
  amount: number;
  type: "split" | "payment" | "adjustment" | "manual";
  reference_id: string | null;
  reason: string | null;
  executed_by: string | null;
  created_at: string;
}

/** Devuelve el usuario Supabase autenticado (o null). */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Perfil del bot (filas de users + wallets) del usuario autenticado. */
export async function getUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, wallet: null, settings: null };

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return { user, profile: null, wallet: null, settings: null };

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("discord_id", profile.discord_id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("guild_settings")
    .select("*")
    .eq("guild_id", profile.guild_id)
    .maybeSingle();

  return { user, profile: profile as Profile, wallet: wallet as Wallet | null, settings };
}

export async function getTransactions(discordId: string, limit = 25) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("to_discord_id", discordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as Transaction[];
}

export async function getSplits(guildId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("splits")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as Split[];
}

export async function getGuildPlayers(guildId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("discord_id, albion_name, display_nick, member_type, fame_tier, kill_fame, registered_at")
    .eq("guild_id", guildId)
    .order("albion_name", { ascending: true })
    .limit(500);
  return data || [];
}

export async function getFameTiers(guildId: string | null) {
  const supabase = await createClient();
  if (!guildId) return [];
  const { data } = await supabase
    .from("fame_tier_roles")
    .select("*")
    .eq("guild_id", guildId)
    .order("sort_order", { ascending: true });
  return data || [];
}

export interface SilverTopEntry {
  discord_id: string;
  albion_name: string | null;
  balance: number;
  splits: number;
}

/** Ranking de silver del gremio vía RPC pública (funciona sin login). */
export async function getSilverTop(guildId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_silver_top_rpc", {
    p_guild_id: guildId,
    p_limit: limit,
  });
  if (error || !data) return [] as SilverTopEntry[];
  return data as SilverTopEntry[];
}

export interface PublicSettings {
  guild_id: string;
  albion_guild_name: string | null;
}

/** Datos públicos del gremio (primer guild con config) para páginas sin login. */
export async function getPublicSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guild_settings")
    .select("guild_id, albion_guild_name")
    .limit(1)
    .maybeSingle();
  return (data as PublicSettings | null) || null;
}

export interface BalanceLookupResult {
  found: boolean;
  discord_id?: string;
  albion_name?: string | null;
  display_nick?: string | null;
  guild_name?: string | null;
  balance?: number;
  rank?: number;
  splits?: number;
}

/** Consulta pública de saldo por nombre de Albion / nick del servidor. */
export async function lookupBalance(name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_balance_rpc", { p_name: name });
  if (error) return null;
  return data as BalanceLookupResult | null;
}