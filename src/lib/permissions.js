const { PermissionFlagsBits } = require('discord.js');

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
}

/**
 * true si el member tiene el rol de Tesorero, o es Administrador
 * (un admin siempre puede hacer lo que puede hacer un tesorero).
 */
function isTreasurer(interaction, guildSettings) {
  if (isAdmin(interaction)) return true;
  if (!guildSettings?.treasurer_role_id) return false;
  return interaction.member.roles.cache.has(guildSettings.treasurer_role_id);
}

/**
 * true si el member tiene el rol de Splits Manager, el de Tesorero,
 * o es Administrador.
 */
function isSplitsManager(interaction, guildSettings) {
  if (isTreasurer(interaction, guildSettings)) return true;
  if (!guildSettings?.splits_manager_role_id) return false;
  return interaction.member.roles.cache.has(guildSettings.splits_manager_role_id);
}

module.exports = { isAdmin, isTreasurer, isSplitsManager };
