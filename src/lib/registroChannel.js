const { supabase } = require('./supabase');

/**
 * Permisos del canal de REGISTRO por usuario.
 *
 * Idea: el canal de registro es un canal "solo para no registrados". En vez
 * de jugar con permisos de rol (que al registrar un miembro habría que
 * quitarle el rol, con todo lo que eso implica), usamos permission
 * overwrites por USUARIO:
 *   - miembro NO registrado → overwrite con ViewChannel + SendMessages.
 *   - miembro registrado    → se borra el overwrite (el canal queda oculto).
 * La excepción por miembro tiene prioridad sobre los permisos del rol, así
 * que aunque tengan el rol "Cosmo Miembro" no ven el canal si no está su
 * overwrite.
 */

async function getRegistroChannel(guild) {
  const { data } = await supabase
    .from('guild_settings')
    .select('registro_channel_id')
    .eq('guild_id', guild.id)
    .maybeSingle();
  if (!data?.registro_channel_id) return null;
  return guild.channels.cache.get(data.registro_channel_id) || null;
}

async function isRegistered(member) {
  const { data } = await supabase
    .from('users')
    .select('discord_id')
    .eq('discord_id', member.id)
    .eq('guild_id', member.guild.id)
    .maybeSingle();
  return Boolean(data?.discord_id);
}

/** Da acceso de lectura/escritura al canal de registro (miembro no registrado). */
async function grantRegistroAccess(member) {
  const channel = await getRegistroChannel(member.guild);
  if (!channel || !channel.isTextBased?.()) return;
  try {
    await channel.permissionOverwrites.create(member.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
    });
  } catch (e) {
    console.warn(`No pude dar acceso al canal de registro a ${member.id}: ${e.message}`);
  }
}

/** Quita el acceso individual al canal de registro (miembro ya registrado). */
async function revokeRegistroAccess(member) {
  const channel = await getRegistroChannel(member.guild);
  if (!channel || !channel.isTextBased?.()) return;
  try {
    await channel.permissionOverwrites.delete(member.id).catch(() => {});
  } catch (e) {
    console.warn(`No pude quitar el acceso al canal de registro a ${member.id}: ${e.message}`);
  }
}

/** Sincroniza el estado del overwrite según si el miembro está registrado. */
async function syncRegistroAccess(member) {
  const registered = await isRegistered(member);
  if (registered) {
    await revokeRegistroAccess(member);
  } else {
    await grantRegistroAccess(member);
  }
  return registered;
}

/** Barrido inicial: aplica el acceso correcto a todos los miembros cacheados. */
async function syncGuildRegistro(guild) {
  if (!guild?.members?.cache?.size) return;
  for (const member of guild.members.cache.values()) {
    try {
      await syncRegistroAccess(member);
    } catch (e) {
      console.warn(`Fallo al sincronizar acceso de registro de ${member.id}: ${e.message}`);
    }
  }
}

module.exports = {
  getRegistroChannel,
  isRegistered,
  grantRegistroAccess,
  revokeRegistroAccess,
  syncRegistroAccess,
  syncGuildRegistro,
};