const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrCreateGuildSettings, updateGuildSettings } = require('../lib/guildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('Crea (si no existen) los roles Tesorero y Splits Manager y los vincula al bot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await getOrCreateGuildSettings(interaction.guildId);
    const guild = interaction.guild;

    let treasurerId = settings.treasurer_role_id;
    let splitsManagerId = settings.splits_manager_role_id;

    if (!treasurerId) {
      const rol = await guild.roles.create({
        name: 'Tesorero',
        color: 0xf1c40f,
        mentionable: true,
        reason: 'Creado por /setup-roles (Cosmopolis Bot)',
      });
      treasurerId = rol.id;
    }

    if (!splitsManagerId) {
      const rol = await guild.roles.create({
        name: 'Splits Manager',
        color: 0x3498db,
        mentionable: true,
        reason: 'Creado por /setup-roles (Cosmopolis Bot)',
      });
      splitsManagerId = rol.id;
    }

    await updateGuildSettings(interaction.guildId, {
      treasurer_role_id: treasurerId,
      splits_manager_role_id: splitsManagerId,
    });

    await interaction.editReply(
      `✅ Roles listos: <@&${treasurerId}> (Tesorero) y <@&${splitsManagerId}> (Splits Manager).\n` +
        `Ahora asígnalos manualmente a las personas de confianza.\n` +
        `⚠️ Recuerda subir el rol del bot por encima de estos dos en la jerarquía del servidor, o no podrá gestionarlos.`
    );
  },
};
