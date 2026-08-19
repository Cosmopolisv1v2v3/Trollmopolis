const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { payUser, getWallet } = require('../lib/banking');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { isTreasurer } = require('../lib/permissions');
const { fmtSilver } = require('../lib/format');

function fmtDate(t) {
  return `<t:${Math.floor(new Date(t).getTime() / 1000)}:d>`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Tesorería: entrega silver a un jugador (resta de su saldo pendiente).')
    .addUserOption((o) => o.setName('usuario').setDescription('Jugador al que se le paga').setRequired(true))
    .addIntegerOption((o) => o.setName('monto').setDescription('Cantidad de silver').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo del pago (queda en el log)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const settings = await getOrCreateGuildSettings(guildId);

    if (!isTreasurer(interaction, settings)) {
      return interaction.editReply('❌ /pagar requiere el rol **Tesorero** (o Administrador).');
    }

    const target = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('monto');
    const reason = interaction.options.getString('motivo').trim();

    if (amount <= 0) {
      return interaction.editReply('❌ El monto debe ser mayor a 0.');
    }
    if (reason.length < 3) {
      return interaction.editReply('❌ El motivo es obligatorio y debe tener al menos 3 caracteres.');
    }
    if (target.id === interaction.user.id) {
      return interaction.editReply('❌ No podés pagarte a vos mismo.');
    }

    // el target debe estar registrado para poder tener wallet
    const wallet = await getWallet(target.id, guildId);

    try {
      const { current, newBalance, allowNegative } = await payUser({
        guildId,
        target: target.id,
        amount,
        reason,
        executedBy: interaction.user.id,
      });

      const emb = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Pago registrado')
        .setDescription(
          `Pagaste **${fmtSilver(amount)}** a **${target.tag}**.\n` +
            `Saldo pendiente del jugador: **${fmtSilver(current)}** → **${fmtSilver(newBalance)}**\n` +
            (allowNegative
              ? '⚠️ El pago superó su saldo pendiente: queda a favor del gremio.'
              : '') +
            `\nMotivo: *${reason}*`
        )
        .setFooter({ text: `Ejecutado por ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [emb] });

      // log al canal de logs
      const logChannel = settings.log_channel_id
        ? interaction.guild.channels.cache.get(settings.log_channel_id)
        : null;
      if (logChannel?.isTextBased()) {
        await logChannel
          .send({
            embeds: [
              new EmbedBuilder()
                .setTitle('💸 Pago realizado')
                .setColor(0x3498db)
                .setDescription(
                  `${interaction.user} pagó **${fmtSilver(amount)}** a ${target} — " ${reason} ".\n` +
                    `Saldo pendiente: ${fmtSilver(current)} → ${fmtSilver(newBalance)}`
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