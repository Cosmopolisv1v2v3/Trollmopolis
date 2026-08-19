const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { supabase } = require('../lib/supabase');
const { getPlayerDetail } = require('../lib/albion');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { finalizeRegistration } = require('../lib/register');
const { postFamaEmbed } = require('../lib/famaChannel');
const { buildRegistrationEmbed, fmtFame } = require('../lib/format');

const PREFIX_SELECT = 'reg:select:';
const PREFIX_CONFIRM = 'reg:confirm:';
const CANCEL = 'reg:cancel';

/** Menú de selección cuando hay varias coincidencias: valor = region|id */
async function handleSelect(interaction, customId) {
  await interaction.deferUpdate(); // ack al instante para no cortar la interacción
  const value = interaction.values[0];
  const [region, playerId] = value.split('|');
  const memberType = customId.slice(PREFIX_SELECT.length);

  let details;
  try {
    details = await getPlayerDetail(region, playerId);
  } catch (err) {
    return interaction.editReply({ content: '❌ No pude cargar el personaje. Intentá de nuevo.', embeds: [], components: [] });
  }

  const match = {
    region,
    id: playerId,
    name: details.Name,
    guildName: details.GuildName || null,
    allianceName: details.AllianceName || null,
    killFame: details.KillFame ?? 0,
  };

  // Repetimos el review para confirmar el elegido
  const { settings, existing } = await reviewContext(interaction);
  const review = new EmbedBuilder()
    .setTitle('📋 Revisa tu registro')
    .setColor(memberType === 'alianza' ? 0x9b59b6 : 0x2ecc71)
    .setDescription(
      `Vas a registrarte como **${match.name}** (${match.region})\n` +
        `Tipo: **${memberType === 'alianza' ? 'Alianza' : 'Miembro'}**` +
        (existing
          ? `\n\n⚠️ **Ya estás registrado** como \`${existing.albion_name}\`. Si confirmas, se actualizan tus datos.`
          : '')
    )
    .setFooter({ text: 'Confirma solo si es tu personaje real.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PREFIX_CONFIRM}${memberType}:${region}:${playerId}`)
      .setLabel(existing ? 'Actualizar registro' : 'Confirmar registro')
      .setStyle(existing ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CANCEL).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
  );

  return interaction.editReply({ embeds: [review], components: [row] });
}

async function reviewContext(interaction) {
  const settings = await getOrCreateGuildSettings(interaction.guildId);
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', interaction.user.id)
    .maybeSingle();
  return { settings, existing };
}

/** Confirmación: ejecuta de verdad el registro. customId = reg:confirm:<tipo>:<region>:<id> */
async function handleConfirm(interaction, customId) {
  await interaction.deferUpdate();
  const [, memberType, region, playerId] = customId.split(':');

  try {
    const result = await finalizeRegistration({
      interaction,
      match: { region, id: playerId },
      memberType,
    });

    // --- embed enriquecido para el canal de registro ---
    const opts = {
      memberType,
      fameTier: result.tier?.label ?? '—',
      nick: result.nick,
      avatar: result.details.Avatar || null,
    };
    const rich = buildRegistrationEmbed(result.details, opts);

    // respuesta privada al usuario
    const doneEmbed = new EmbedBuilder()
      .setTitle('✅ ¡Registro completado!')
      .setColor(0x2ecc71)
      .setDescription(
        `Quedaste registrado como **${result.details.Name}** (${result.region}) con el nick \`${result.nick}\`.\n` +
          `Tipo: **${memberType === 'alianza' ? 'Alianza' : 'Miembro'}**\n` +
          `Tramo de fama: **${result.tier?.label ?? '—'}**` +
          (result.nickApplied ? '' : '\n\n⚠️ No pude cambiar tu nick (revisá la jerarquía de roles del bot).')
      );

    await interaction.editReply({ embeds: [doneEmbed], components: [] });

    // --- canal de registro (público) ---
    const settings = result.settings;
    if (settings.registro_channel_id) {
      const canal = interaction.guild.channels.cache.get(settings.registro_channel_id);
      if (canal?.isTextBased()) {
        await canal
          .send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.tag} se registró`, iconURL: interaction.user.displayAvatarURL() })
                .setColor(memberType === 'alianza' ? 0x9b59b6 : 0x2ecc71)
                .setDescription(
                  `**${result.details.Name}** — tramo **${result.tier?.label ?? '—'}** · fama ${fmtFame(result.killFame ?? result.fama)}\n` +
                    `Consulta tu balance con \`/silver\`.`
                ),
            ],
          })
          .catch(() => {});
      }
    }

    // --- canal de fama: embed completo con info de la API y rol de fama ---
    await postFamaEmbed({
      interaction,
      settings: result.settings,
      details: result.details,
      opts: {
        memberType,
        fameTier: result.tier?.label ?? '—',
        fameTierRole: result.tier?.role_id,
        nick: result.nick,
        avatar: result.details.Avatar || null,
      },
    });
  } catch (err) {
    console.error('Error registrando:', err);
    await interaction.editReply({
      embeds: [],
      content: `❌ No se pudo completar el registro: ${err.message}`,
      components: [],
    });
  }
}

async function handleCancel(interaction) {
  return interaction.update({
    embeds: [],
    components: [],
    content: 'Registro cancelado.',
  });
}

module.exports = {
  [PREFIX_SELECT]: handleSelect,
  [PREFIX_CONFIRM]: handleConfirm,
  [CANCEL]: handleCancel,
};