const { supabase } = require('./supabase');

/**
 * Devuelve la fila de guild_settings para un servidor de Discord.
 * Si no existe todavía (primera vez que se usa el bot en ese server),
 * la crea con los valores por defecto.
 */
async function getOrCreateGuildSettings(guildId) {
  const { data: existing, error: selectError } = await supabase
    .from('guild_settings')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('guild_settings')
    .insert({ guild_id: guildId })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created;
}

async function updateGuildSettings(guildId, patch) {
  await getOrCreateGuildSettings(guildId); // asegura que la fila exista
  const { data, error } = await supabase
    .from('guild_settings')
    .update(patch)
    .eq('guild_id', guildId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

module.exports = { getOrCreateGuildSettings, updateGuildSettings };
