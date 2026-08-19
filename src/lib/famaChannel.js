const { getOrCreateGuildSettings } = require('./guildSettings');
const { buildRegistrationEmbed } = require('./format');

/** Devuelve el canal de texto si el id es válido en el guild, o null. */
function resolveChannel(interaction, channelId) {
  if (!channelId) return null;
  const canal = interaction.guild?.channels?.cache?.get(channelId);
  return canal?.isTextBased() ? canal : null;
}

/**
 * Publica el embed enriquecido (info de la API + rol de fama) en el canal
 * de fama del gremio. No hace nada si no hay canal configurado.
 */
async function postFamaEmbed({ interaction, details, opts = {}, settings }) {
  const gs = settings || (await getOrCreateGuildSettings(interaction.guildId));
  const canal = resolveChannel(interaction, gs.fama_channel_id);
  if (!canal) return null;
  return canal.send({ embeds: [buildRegistrationEmbed(details, opts)] }).catch(() => null);
}

module.exports = { postFamaEmbed, resolveChannel };