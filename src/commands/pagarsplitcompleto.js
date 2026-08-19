const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { supabase } = require('../lib/supabase');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { isTreasurer } = require('../lib/permissions');
const { paySplitComplete, searchSplits } = require('../lib/splits');
const { fmtSilver } = require('../lib/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagarsplitcompleto')
    .setDescription('Tesorero: paga un split completo — descuenta a cada participante lo acreditado.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName('split_id')
        .setDescription('ID del split (autocompletado mientras escribís)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const query = String(focused).trim().toLowerCase();
    const rows = await searchSplits({ guildId: interaction.guildId, prefix: query, limit: 25 });

    const choices = rows.map((s) => {
      const state = s.status === 'paid' ? '✅ pagado' : s.status === 'cancelled' ? '❌ cancelado' : '🔓';
      return {
        name: `#${s.id.slice(0, 6)} · ${fmtSilver(s.total_amount)} · ${state}`.slice(0, 100),
        value: s.id,
      };
    });

    if (choices.length === 0) {
      choices.push({
        name: 'Sin splits encontrados para este gremio',
        value: 'none',
      });
    }
    return interaction.respond(choices);
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const settings = await getOrCreateGuildSettings(guildId);

    if (!isTreasurer(interaction, settings)) {
      return interaction.editReply('❌ /pagarsplitcompleto requiere el rol **Tesorero** (o Administrador).');
    }

    const splitIdMatch = interaction.options.getString('split_id').trim().toLowerCase();

    const { data: splits } = await supabase
      .from('splits')
      .select('id, guild_id, status, created_at, total_amount, tax_percent, net_amount, loot_location')
      .ilike('id', `${splitIdMatch}%`)
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .limit(1);

    const split = splits?.[0];
    if (!split) {
      return interaction.editReply('❌ No encontré ningún split con ese ID.');
    }

    try {
      const { participants, total } = await paySplitComplete({
        splitId: split.id,
        paidBy: interaction.user.id,
      });

      const emb = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Split pagado completo')
        .setDescription(
          `Split **#${split.id.slice(0, 6)}** — total **${fmtSilver(split.total_amount)}** · neto **${fmtSilver(split.net_amount)}**\n` +
            `Se descontó **${fmtSilver(total)}** en total a **${participants.length}** participantes (${fmtSilver(participants[0]?.amount ?? 0)} c/u).\n` +
            `Si alguien quedó en negativo, es un favor que le queda al gremio.`
        )
        .setFooter({ text: `Pagado por ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [emb] });

      const logChannel = settings.log_channel_id
        ? interaction.guild.channels.cache.get(settings.log_channel_id)
        : null;
      if (logChannel?.isTextBased()) {
        await logChannel
          .send({
            embeds: [
              new EmbedBuilder()
                .setTitle('💰 Split pagado completo')
                .setColor(0x3498db)
                .setDescription(
                  `${interaction.user} pagó el split **#${split.id.slice(0, 6)}** — se descontó **${fmtSilver(total)}** a ${participants.length} participantes.`
                )
                .setTimestamp(),
            ],
          })
          .catch(() => {});
      }
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }
  },
};