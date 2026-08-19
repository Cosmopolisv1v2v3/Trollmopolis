require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { supabase } = require('./lib/supabase');
const { syncCommandsForGuild } = require('./lib/commandSync');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_DEV_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID en las variables de entorno.');
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    // 1) Limpiar comandos globales: un comando global no puede ocultarse por servidor,
    //    así que todo se registra a nivel de guild (servidor).
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [] });

    // 2) Servidores objetivo: el de desarrollo si está seteado, si no los de la BD.
    let guilds;
    if (DISCORD_DEV_GUILD_ID) {
      const { data } = await supabase
        .from('guild_settings')
        .select('guild_id, config_completed')
        .eq('guild_id', DISCORD_DEV_GUILD_ID)
        .maybeSingle();
      guilds = [{ guild_id: DISCORD_DEV_GUILD_ID, config_completed: data?.config_completed || false }];
    } else {
      guilds = (await supabase.from('guild_settings').select('guild_id, config_completed')).data || [];
    }

    if (!guilds.length) {
      console.warn('⚠️  No hay servidores registrados. Registralos con /config o corre el bot una vez.');
      return;
    }

    for (const guild of guilds) {
      const gid = typeof guild === 'string' ? guild : guild.guild_id;
      const locked = typeof guild === 'string' ? false : !!guild.config_completed;
      const res = await syncCommandsForGuild(gid, locked);
      console.log(`✅ ${res.visible.length} comandos en ${gid}${locked ? ` (ocultos: ${res.hidden.join(', ')})` : ''}`);
    }
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
    process.exit(1);
  }
})();