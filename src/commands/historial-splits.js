const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { splitHistoryForUser } = require('../lib/splits');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { isTreasurer } = require('../lib/permissions');
const { fmtSilver } = require('../lib/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historial-splits')
    .setDescription('Muestra los splits en los que participaste (o participó otro miembro).')
    .addUserOption((o) =>
      o.setName('usuario').setDescription('Otro miembro (solo tesorero)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await getOrCreateGuildSettings(interaction.guildId);
    const target = interaction.options.getUser('usuario');

    if (target && !isTreasurer(interaction, settings)) {
      return interaction.editReply('❌ Consultar historiales de otros requiere el rol **Tesorero**.');
    }

    const discordId = target ? target.id : interaction.user.id;
    const rows = await splitHistoryForUser(discordId, 12);

    if (!rows.length) {
      return interaction.editReply(
        `ℹ️ ${target ? target.tag : 'Todavía'} no figura en ningún split.`
      );
    }

    const emb = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`📜 Historial de splits de ${target ? target.tag : 'tu cuenta'}`)
      .setDescription(
        rows
          .map((r, i) => {
            const s = r.splits || {};
            const state =
              s.status === 'cancelled' ? '~~cancelado~~' : s.status === 'locked' ? '🔒' : '🔓';
            return (
              `**${i + 1}.** Split \`${s.id ? s.id.slice(0, 6) : '?'}\` — \`${fmtSilver(r.amount)}\` ${state}\n` +
              `   ${fmtSilver(s.total_amount || 0)} total · ${s.loot_location || 's/n'} · <t:${Math.floor(new Date(r.created_at).getTime() / 1000)}:d>`
            );
          })
          .join('\n')
      )
      .setFooter({ text: 'Consultá /silver para ver tu saldo actual.' });

    return interaction.editReply({ embeds: [emb] });
  },
};