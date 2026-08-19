const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica que el bot está vivo y conectado a la base de datos.'),

  async execute(interaction) {
    const { supabase } = require('../lib/supabase');
    const start = Date.now();
    const { error } = await supabase.from('guild_settings').select('guild_id').limit(1);
    const dbMs = Date.now() - start;

    await interaction.reply({
      content: error
        ? `🏓 Pong! (bot ok, pero la DB falló: ${error.message})`
        : `🏓 Pong! Latencia bot: ${Math.round(interaction.client.ws.ping)}ms · DB: ${dbMs}ms`,
      ephemeral: true,
    });
  },
};
