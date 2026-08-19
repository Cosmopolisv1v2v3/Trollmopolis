const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTransactionHistory } = require('../lib/banking');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { isTreasurer } = require('../lib/permissions');
const { fmtSilver } = require('../lib/format');

const TYPE_EMOJI = { split: '💰', payment: '💸', adjustment: '⚖️', manual: '✍️' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historial-pagos')
    .setDescription('Muestra los pagos/movimientos de tu cuenta (o de otro miembro).')
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
    const tx = await getTransactionHistory(discordId, { limit: 20 });

    if (!tx.length) {
      return interaction.editReply(
        `ℹ️ ${target ? target.tag : 'No tenés'} movimientos todavía.`
      );
    }

    const emb = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🧾 Movimientos de ${target ? target.tag : 'tu cuenta'}`)
      .setDescription(
        tx
          .map((t) => {
            const sign = t.amount >= 0 ? '+' : '';
            const type = TYPE_EMOJI[t.type] || '📄';
            const note = t.reason ? ` — *${String(t.reason).slice(0, 60)}*` : '';
            return (
              `${type} \`${sign}${fmtSilver(t.amount)}\` · <t:${Math.floor(new Date(t.created_at).getTime() / 1000)}:d>` +
              note
            );
          })
          .join('\n')
      )
      .setFooter({ text: 'Últimos 20 movimientos.' });

    return interaction.editReply({ embeds: [emb] });
  },
};