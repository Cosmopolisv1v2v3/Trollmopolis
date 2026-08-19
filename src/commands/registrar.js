const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { searchPlayerInRegion } = require('../lib/albion');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { finalizeRegistration } = require('../lib/register');
const { postFamaEmbed } = require('../lib/famaChannel');
const { supabase } = require('../lib/supabase');
const { fmtFame } = require('../lib/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Vincula tu personaje de Albion Online y obtené tus roles.')
    .addStringOption((o) =>
      o
        .setName('usuario_albion')
        .setDescription('Nombre exacto de tu personaje en Albion')
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('tipo')
        .setDescription('¿Miembro del gremio o de la alianza?')
        .setRequired(true)
        .addChoices(
          { name: 'Miembro', value: 'miembro' },
          { name: 'Alianza', value: 'alianza' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const nombre = interaction.options.getString('usuario_albion').trim();
    const memberType = interaction.options.getString('tipo');
    const settings = await getOrCreateGuildSettings(guildId);
    // Solo buscamos en la región del gremio: el personaje tiene que estar ahí.
    const region = settings.albion_region || 'america';

    let matches;
    try {
      matches = await searchPlayerInRegion(nombre, region);
    } catch (err) {
      return interaction.editReply(
        `❌ Error consultando la API de Albion (${region}): ${err.message}`
      );
    }

    // priorizamos coincidencias EXACTAS de nombre; si no hay, el mejor candidato por gremio.
    const exact = matches.filter((m) => m.name.toLowerCase() === nombre.toLowerCase());
    const pool = [...(exact.length ? exact : matches)].sort((a, b) => {
      const score = (m) =>
        m.guildName?.toLowerCase() === String(settings.albion_guild_name || '').toLowerCase()
          ? 3
          : 0;
      return score(b) - score(a);
    });

    if (pool.length === 0) {
      return interaction.editReply(
        `❌ No encontré ningún personaje llamado "${nombre}" en la región **${region.toUpperCase()}** (donde está vinculado el gremio).\n` +
          `Revisá que sea el nombre EXACTO en Albion (mayúsculas y espacios incluidos).`
      );
    }

    // Caso típico: un único candidato en la región -> registro directo,
    // con los datos que ya devolvió la búsqueda (sin esperar la API ni confirmar).
    if (pool.length === 1) {
      return fastRegister(interaction, { match: pool[0], memberType });
    }

    // Varias coincidencias exactas en la MISMA región (inusual): menú de selección.
    const select = new StringSelectMenuBuilder()
      .setCustomId(`reg:select:${memberType}`)
      .setPlaceholder('Elegí tu personaje (varias coincidencias)')
      .addOptions(
        pool.slice(0, 25).map((m, i) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(m.name)
            .setValue(`${m.region}|${m.id}`)
            .setDescription(`${m.guildName || 'sin gremio'} · ${m.region} · ${fmtFame(m.killFame)}`)
        )
      );
    const row = new ActionRowBuilder().addComponents(select);

    const emb = new EmbedBuilder()
      .setTitle('ℹ️ Varias coincidencias encontradas')
      .setDescription(`Hay ${pool.length} personajes con ese nombre en ${region.toUpperCase()}. Elegí el tuyo:`)
      .setColor(0x5865f2);

    return interaction.editReply({ embeds: [emb], components: [row] });
  },
};

/** Registro directo (sin paso de confirmación): crea el embed y publica en el canal de registro. */
async function fastRegister(interaction, { match, memberType }) {
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('albion_name')
      .eq('discord_id', interaction.user.id)
      .maybeSingle();

    const result = await finalizeRegistration({
      interaction,
      match,
      memberType,
      detailOverride: match,
    });

    const doneEmbed = new EmbedBuilder()
      .setTitle('✅ ¡Registro completado!')
      .setColor(0x2ecc71)
      .setDescription(
        `Quedaste registrado como **${result.details.Name}** (${result.region}) con el nick \`${result.nick}\`.\n` +
          `Tipo: **${memberType === 'alianza' ? 'Alianza' : 'Miembro'}**\n` +
          `Tramo de fama: **${result.tier?.label ?? '—'}**` +
          (existing && existing.albion_name !== result.details.Name
            ? `\n\n⚠️ Reemplazaste tu registro anterior (\`${existing.albion_name}\`).`
            : '') +
          (result.nickApplied ? '' : '\n\n⚠️ No pude cambiar tu nick (revisá la jerarquía de roles del bot).')
      );

    await interaction.editReply({ embeds: [doneEmbed] });

    // --- canal de registro (público) ---
    const settings = result.settings;
    if (settings.registro_channel_id) {
      const canal = interaction.guild.channels.cache.get(settings.registro_channel_id);
      if (canal?.isTextBased()) {
        await canal
          .send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: `${interaction.user.tag} se registró`,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setColor(memberType === 'alianza' ? 0x9b59b6 : 0x2ecc71)
                .setDescription(
                  `**${result.details.Name}** — tramo **${result.tier?.label ?? '—'}** · fama ${fmtFame(result.fama)}\n` +
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
    return interaction.editReply(`❌ No se pudo completar el registro: ${err.message}`);
  }
}