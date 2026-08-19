const { Events } = require('discord.js');
const { route } = require('../components/index');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // --- comandos de barra ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`Comando no encontrado: ${interaction.commandName}`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Error ejecutando /${interaction.commandName}:`, err);
        const payload = {
          content: '❌ Ocurrió un error ejecutando el comando. Ya quedó registrado en los logs.',
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // --- autocompletado ---
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`Error en autocomplete /${interaction.commandName}:`, err);
        await interaction.respond([]).catch(() => {});
      }
      return;
    }

    // --- botones / menús / modales ---
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      const type = interaction.isButton()
        ? 'button'
        : interaction.isStringSelectMenu()
        ? 'select'
        : 'modal';
      try {
        await route(type, interaction);
      } catch (err) {
        console.error(`Error en componente ${interaction.customId}:`, err);
        const payload = { content: '❌ Ocurrió un error procesando esta interacción.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    }
  },
};