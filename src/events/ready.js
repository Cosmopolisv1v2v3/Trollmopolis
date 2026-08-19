const { Events } = require('discord.js');
const { supabase } = require('../lib/supabase');
const { SPLIT_LOCK_MINUTES } = require('../lib/splits');
const { syncGuildStaff } = require('../lib/staff');
const { syncGuildRegistro } = require('../lib/registroChannel');
const { syncCommandsForGuild } = require('../lib/commandSync');

async function syncAllStaff(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      await syncGuildStaff(guild);
    } catch (e) {
      console.warn(`Fallo al sincronizar staff de ${guild.id}: ${e.message}`);
    }
  }
}

async function syncAllRegistro(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      await syncGuildRegistro(guild);
    } catch (e) {
      console.warn(`Fallo al sincronizar acceso de registro de ${guild.id}: ${e.message}`);
    }
  }
}

/** Registra los comandos de cada servidor según su config_completed. */
async function syncAllCommands(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const { data } = await supabase
        .from('guild_settings')
        .select('config_completed')
        .eq('guild_id', guild.id)
        .maybeSingle();
      const locked = !!data?.config_completed;
      const res = await syncCommandsForGuild(guild.id, locked);
      console.log(
        `📋 ${guild.name}: ${res.visible.length} comandos visibles${res.hidden.length ? ` (ocultos: ${res.hidden.join(', ')})` : ''}`
      );
    } catch (e) {
      console.warn(`Fallo al sincronizar comandos de ${guild.id}: ${e.message}`);
    }
  }
}

async function lockOverdueSplits() {
  try {
    const cutoff = new Date(Date.now() - SPLIT_LOCK_MINUTES * 60_000).toISOString();
    const { data, error } = await supabase
      .from('splits')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('status', 'open')
      .lt('created_at', cutoff)
      .select('id');
    if (error) {
      console.error('Error en auto-lock de splits:', error.message);
      return;
    }
    if (data?.length) {
      console.log(`🔒 ${data.length} split(s) bloqueados automáticamente por ventana de edición.`);
    }
  } catch (e) {
    console.error('Error en auto-lock:', e.message);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Conectado como ${client.user.tag} — en ${client.guilds.cache.size} servidor(es).`);
    lockOverdueSplits();
    setInterval(lockOverdueSplits, 60_000).unref();
    syncAllStaff(client);
    syncAllRegistro(client);
    syncAllCommands(client);
  },
};