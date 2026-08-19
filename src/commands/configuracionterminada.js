const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { updateGuildSettings } = require('../lib/guildSettings');
const { syncCommandsForGuild } = require('../lib/commandSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configuracionterminada')
    .setDescription('Marca si la configuración del servidor está lista (oculta/muestra comandos).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((o) =>
      o
        .setName('valor')
        .setDescription('true = configuración terminada (oculta comandos de setup); false = muestra todo')
        .setRequired(true)
    ),

  async execute(interaction) {
    const valor = interaction.options.getBoolean('valor');
    const guildId = interaction.guildId;

    await updateGuildSettings(guildId, { config_completed: valor });

    const result = await syncCommandsForGuild(guildId, valor);

    const embed = new EmbedBuilder()
      .setTitle(valor ? '🔒 Configuración terminada' : '🔓 Modo configuración')
      .setColor(valor ? 0xf1c40f : 0x2ecc71)
      .setDescription(
        valor
          ? `Comandos visibles: **${result.visible.length}**\nComandos ocultos: **${result.hidden.length}** — ${result.hidden.map((c) => `\`/${c}\``).join(', ') || 'ninguno'}`
          : `Se muestran todos los comandos: **${result.visible.length}**`
      )
      .setFooter({ text: 'Puede tardar unos segundos en propagarse.' });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};