const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const COLORS = {
  rojo: 0xe74c3c,
  naranja: 0xe67e22,
  amarillo: 0xf1c40f,
  verde: 0x2ecc71,
  esmeralda: 0x1abc9c,
  celeste: 0x3498db,
  azul: 0x206694,
  morado: 0x9b59b6,
  purpura: 0x8e44ad,
  rosa: 0xe91e63,
  rosado: 0xe91e63,
  blanco: 0xffffff,
  gris: 0x95a5a6,
  negro: 0x111111,
  marron: 0x795548,
};

/** Acepta "rojo", "#ff0000" o "0xE74C3C" y devuelve el int. */
function parseColor(raw) {
  if (!raw) return 0x5865f2;
  const s = raw.trim().toLowerCase();
  if (COLORS[s]) return COLORS[s];
  const hex = s.replace('#', '').replace('0x', '');
  if (/^[0-9a-f]{6}$/.test(hex)) return parseInt(hex, 16);
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crea y publica un embed bonito en un canal (solo Administradores).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((o) =>
      o
        .setName('canal')
        .setDescription('Canal donde publicar el embed')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('texto').setDescription('Texto/descripción del embed').setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('color')
        .setDescription('Color: rojo, verde, azul, #RRGGBB… (vacío = azul)')
        .setRequired(false)
    )
    .addStringOption((o) =>
      o.setName('titulo').setDescription('Título del embed (opcional)').setRequired(false)
    )
    .addAttachmentOption((o) =>
      o.setName('imagen').setDescription('Imagen a incluir (opcional)').setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('canal');
    const texto = interaction.options.getString('texto');
    const titulo = interaction.options.getString('titulo')?.trim();
    const colorRaw = interaction.options.getString('color');
    const image = interaction.options.getAttachment('imagen');

    const color = parseColor(colorRaw);
    if (color === null) {
      return interaction.reply({
        content: `❌ No reconozco el color \`${colorRaw}\`. Usá uno de: ${Object.keys(COLORS).join(', ')} o un hex como #3498db.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder().setColor(color);

    if (titulo) embed.setTitle(titulo.slice(0, 256));
    if (texto) embed.setDescription(texto.slice(0, 4096));
    embed.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });
    if (image && image.contentType?.startsWith('image/')) {
      embed.setImage(image.url);
    }
    embed.setTimestamp();

    const sent = await channel.send({ embeds: [embed] });

    return interaction.reply({
      content: `✅ Embed publicado en ${channel}${image ? ' con imagen.' : '.'} ${sent.url}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};