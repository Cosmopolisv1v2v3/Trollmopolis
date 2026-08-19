/** Actualiza el canal-contador con debounce (Discord limita renombres de canales). */
const { supabase } = require('./supabase');

const lastUpdate = new Map(); // guildId -> timestamp

const DEBOUNCE_MS = 5 * 60_000; // 5 min mínimo entre renombres

async function refreshCounter(guild) {
  if (!guild) return;
  const settings = await getCounterSetting(guild.id);
  if (!settings?.counter_channel_id) return;

  const now = Date.now();
  const prev = lastUpdate.get(guild.id) || 0;
  if (now - prev < DEBOUNCE_MS) return;
  lastUpdate.set(guild.id, now);

  const channel = guild.channels.cache.get(settings.counter_channel_id);
  if (!channel) return;
  const total = guild.memberCount;
  channel
    .setName(`👥 Miembros: ${total}`)
    .catch((err) => console.error('No pude actualizar el contador:', err.message));
}

async function getCounterSetting(guildId) {
  const { data } = await supabase
    .from('guild_settings')
    .select('counter_channel_id')
    .eq('guild_id', guildId)
    .maybeSingle();
  return data;
}

module.exports = { refreshCounter };