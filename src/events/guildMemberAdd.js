const { Events, EmbedBuilder } = require("discord.js");
const { supabase } = require("../lib/supabase");
const { refreshCounter } = require("../lib/counter");
const { syncMemberStaff } = require("../lib/staff");
const { syncRegistroAccess } = require("../lib/registroChannel");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const { data: settings } = await supabase
      .from("guild_settings")
      .select("welcome_channel_id, welcome_message")
      .eq("guild_id", member.guild.id)
      .maybeSingle();

    if (settings?.welcome_channel_id) {
      const canal = member.guild.channels.cache.get(
        settings.welcome_channel_id,
      );
      if (canal?.isTextBased()) {
        const custom = settings.welcome_message?.trim();
        const description = custom
          ? custom
              .replaceAll("{mencion}", String(member))
              .replaceAll("{nombre}", member.displayName)
          : `Hola ${member} nos alegra tenerte por acá.\n` +
            `Usa revisa el canal 『⁉️』ᴄᴏᴍᴏ-ᴘᴏꜱᴛᴜʟᴀʀ.`;

        const embed = new EmbedBuilder()
          .setTitle("¡Bienvenido/a a Cosmopolis! 🏰")
          .setDescription(description)
          .setThumbnail(member.user.displayAvatarURL())
          .setColor(0x2ecc71)
          .setTimestamp();

        canal
          .send({ embeds: [embed] })
          .catch((err) =>
            console.error(
              "No pude enviar el mensaje de bienvenida:",
              err.message,
            ),
          );
      }
    }

    refreshCounter(member.guild);
    // Dar/quitar acceso al canal de registro según el estado del miembro.
    try {
      await syncRegistroAccess(member);
    } catch (e) {
      console.warn(`No pude sincronizar acceso de registro de ${member.id}: ${e.message}`);
    }
    try {
      await syncMemberStaff(member);
    } catch (e) {
      console.warn(`No pude sincronizar staff de ${member.id}: ${e.message}`);
    }
  },
};
