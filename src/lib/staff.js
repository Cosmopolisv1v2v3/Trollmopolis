const { PermissionFlagsBits } = require('discord.js');
const { supabase } = require('./supabase');

/**
 * Mira los roles reales del member en Discord y persiste los flags
 * is_admin / is_treasurer / is_splits_manager en `users`.
 *
 * Los Administradores siempre cuentan como staff (mismo criterio que
 * src/lib/permissions.js). Si el member no está registrado, se ignora.
 */
async function syncMemberStaff(member) {
  const guildId = member.guild?.id;
  if (!guildId) return;

  const { data: settings } = await supabase
    .from('guild_settings')
    .select('treasurer_role_id, splits_manager_role_id')
    .eq('guild_id', guildId)
    .maybeSingle();
  if (!settings) return; // bot sin configurar todavía

  const hasRole = (roleId) => Boolean(roleId && member.roles?.cache?.has(roleId));
  const isAdmin = member.permissions?.has(PermissionFlagsBits.Administrator) ?? false;

  const isTreasurer = isAdmin || hasRole(settings.treasurer_role_id);
  const isSplitsManager = isAdmin || hasRole(settings.splits_manager_role_id);

  const { error } = await supabase
    .from('users')
    .update({
      is_admin: isAdmin,
      is_treasurer: isTreasurer,
      is_splits_manager: isSplitsManager,
      updated_at: new Date().toISOString(),
    })
    .eq('discord_id', member.id)
    .eq('guild_id', guildId);

  if (error) {
    console.warn(`No pude sincronizar flags de staff de ${member.id}: ${error.message}`);
  }
}

/** Barrido inicial: sincroniza todos los members cacheados de un guild. */
async function syncGuildStaff(guild) {
  if (!guild?.members?.cache?.size) return;
  for (const member of guild.members.cache.values()) {
    try {
      await syncMemberStaff(member);
    } catch (e) {
      console.warn(`Fallo al sincronizar staff de ${member.id}: ${e.message}`);
    }
  }
}

module.exports = { syncMemberStaff, syncGuildStaff };