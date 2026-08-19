const { getWallet } = require("../lib/banking");
const { getOrCreateGuildSettings } = require("../lib/guildSettings");
const { isTreasurer } = require("../lib/permissions");
const { fmtSilver } = require("../lib/format");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("silver")
    .setDescription(
      "Muestra tu saldo pendiente por cobrar (o el de otro, si sos tesorero).",
    )
    .addUserOption((o) =>
      o
        .setName("usuario")
        .setDescription("Otro miembro (solo tesorero)")
        .setRequired(false),
    ),

  async execute(interaction) {
    const settings = await getOrCreateGuildSettings(interaction.guildId);
    const target = interaction.options.getUser("usuario");
    if (target && !isTreasurer(interaction, settings)) {
      return interaction.reply({
        content: "❌ No podés ver el balance de otros.",
        ephemeral: true,
      });
    }
    const wallet = await getWallet(
      target ? target.id : interaction.user.id,
      interaction.guildId,
    );
    const emb = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`💰 Silver de ${target ? target.tag : "tu cuenta"}`)
      .setDescription(`🪙 **${fmtSilver(wallet.balance)}** silver`)
      .setFooter({
        text: "Consultar con un tesorero para reclamar tu silver",
      });
    return interaction.reply({ embeds: [emb], ephemeral: true });
  },
};
