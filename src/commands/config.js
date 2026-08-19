const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const { supabase } = require('../lib/supabase');
const { getOrCreateGuildSettings, updateGuildSettings } = require('../lib/guildSettings');
const { findGuildExact } = require('../lib/albion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configuración del bot para este servidor (solo Administradores).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sc) =>
      sc
        .setName('welcome')
        .setDescription('Canal donde se publican los mensajes de bienvenida.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de texto')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('contador')
        .setDescription('Canal de voz usado como contador de miembros.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de voz')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('splits')
        .setDescription('Canal donde se publican los splits.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de texto')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('registro')
        .setDescription('Canal donde se publica el embed de cada registro.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de texto')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('fama-canal')
        .setDescription('Canal donde se muestra el embed con la info de la API y el rol de fama asignado.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de texto')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('logs')
        .setDescription('Canal donde se publican pagos y ajustes.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de texto')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('roles')
        .setDescription('Roles de Miembro y Alianza que se asignan al registrarse.')
        .addRoleOption((o) => o.setName('miembro').setDescription('Rol de Miembro').setRequired(true))
        .addRoleOption((o) => o.setName('alianza').setDescription('Rol de Alianza').setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName('prefijo')
        .setDescription('Prefijo del nickname al registrarse, ej. Cosm -> Cosm-Nombre.')
        .addStringOption((o) =>
          o.setName('valor').setDescription('Prefijo, sin el guion').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('albion-guild')
        .setDescription('Vincula el gremio de Albion (busca en las 3 regiones automáticamente).')
        .addStringOption((o) =>
          o.setName('nombre').setDescription('Nombre exacto del gremio en Albion').setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('fama-agregar')
        .setDescription('Agrega un tramo de fama y el rol que se asigna en ese rango.')
        .addStringOption((o) => o.setName('etiqueta').setDescription('Ej: Veterano').setRequired(true))
        .addIntegerOption((o) =>
          o.setName('min').setDescription('Fama mínima (inclusive)').setRequired(true)
        )
        .addRoleOption((o) => o.setName('rol').setDescription('Rol a asignar').setRequired(true))
        .addIntegerOption((o) =>
          o.setName('max').setDescription('Fama máxima (dejar vacío = sin tope)').setRequired(false)
        )
    )
    .addSubcommand((sc) => sc.setName('fama-listar').setDescription('Lista los tramos de fama configurados.'))
    .addSubcommand((sc) =>
      sc
        .setName('fama-eliminar')
        .setDescription('Elimina un tramo de fama por su etiqueta.')
        .addStringOption((o) =>
          o.setName('etiqueta').setDescription('Etiqueta exacta a eliminar').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    switch (sub) {
      case 'welcome': {
        const canal = interaction.options.getChannel('canal');
        await updateGuildSettings(guildId, { welcome_channel_id: canal.id });
        return interaction.reply({ content: `✅ Canal de bienvenida: ${canal}`, ephemeral: true });
      }

      case 'contador': {
        const canal = interaction.options.getChannel('canal');
        await updateGuildSettings(guildId, { counter_channel_id: canal.id });
        return interaction.reply({ content: `✅ Canal contador: ${canal}`, ephemeral: true });
      }

      case 'splits': {
        const canal = interaction.options.getChannel('canal');
        await updateGuildSettings(guildId, { split_channel_id: canal.id });
        return interaction.reply({ content: `✅ Canal de splits: ${canal}`, ephemeral: true });
      }

      case 'registro': {
        const canal = interaction.options.getChannel('canal');
        await updateGuildSettings(guildId, { registro_channel_id: canal.id });
        return interaction.reply({ content: `✅ Canal de registro: ${canal}`, ephemeral: true });
      }

      case 'fama-canal': {
        const canal = interaction.options.getChannel('canal');
        await updateGuildSettings(guildId, { fama_channel_id: canal.id });
        return interaction.reply({
          content: `✅ Canal de fama: ${canal}. Ahí se publicarán los embeds con la info de la API y el rol de fama asignado.`,
          ephemeral: true,
        });
      }

      case 'logs': {
        const canal = interaction.options.getChannel('canal');
        await updateGuildSettings(guildId, { log_channel_id: canal.id });
        return interaction.reply({ content: `✅ Canal de logs: ${canal}`, ephemeral: true });
      }

      case 'roles': {
        const miembro = interaction.options.getRole('miembro');
        const alianza = interaction.options.getRole('alianza');
        await updateGuildSettings(guildId, {
          member_role_id: miembro.id,
          alliance_role_id: alianza.id,
        });
        return interaction.reply({
          content: `✅ Rol Miembro: ${miembro} · Rol Alianza: ${alianza}`,
          ephemeral: true,
        });
      }

      case 'prefijo': {
        const valor = interaction.options.getString('valor').trim();
        await updateGuildSettings(guildId, { nick_prefix: valor });
        return interaction.reply({
          content: `✅ Prefijo actualizado. Los nuevos registros quedarán como \`${valor}-Nombre\`.`,
          ephemeral: true,
        });
      }

      case 'albion-guild': {
        await interaction.deferReply({ ephemeral: true });
        const nombre = interaction.options.getString('nombre');

        let matches;
        try {
          matches = await findGuildExact(nombre);
        } catch (err) {
          return interaction.editReply(`❌ Error consultando la API de Albion: ${err.message}`);
        }

        if (matches.length === 0) {
          return interaction.editReply(
            `❌ No encontré ningún gremio llamado exactamente "${nombre}" en ninguna región (America/Europe/Asia). Revisa mayúsculas y espacios.`
          );
        }
        if (matches.length > 1) {
          const lista = matches
            .map((m) => `• **${m.name}** (${m.region}) — id: \`${m.id}\``)
            .join('\n');
          return interaction.editReply(
            `⚠️ Encontré más de una coincidencia exacta en distintas regiones, algo raro:\n${lista}\nAvisa a un desarrollador antes de continuar.`
          );
        }

        const guild = matches[0];
        await updateGuildSettings(guildId, {
          albion_guild_id: guild.id,
          albion_guild_name: guild.name,
          albion_region: guild.region,
        });

        return interaction.editReply(
          `✅ Vinculado: **${guild.name}** — región detectada: **${guild.region}**.`
        );
      }

      case 'fama-agregar': {
        const etiqueta = interaction.options.getString('etiqueta');
        const min = interaction.options.getInteger('min');
        const max = interaction.options.getInteger('max'); // puede ser null
        const rol = interaction.options.getRole('rol');

        if (max !== null && max <= min) {
          return interaction.reply({
            content: '❌ El máximo debe ser mayor al mínimo.',
            ephemeral: true,
          });
        }

        await getOrCreateGuildSettings(guildId);
        const { data: existentes } = await supabase
          .from('fame_tier_roles')
          .select('sort_order')
          .eq('guild_id', guildId)
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextOrder = (existentes?.[0]?.sort_order ?? 0) + 1;

        const { error } = await supabase.from('fame_tier_roles').insert({
          guild_id: guildId,
          role_id: rol.id,
          label: etiqueta,
          min_fame: min,
          max_fame: max,
          sort_order: nextOrder,
        });

        if (error) {
          return interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
        }

        return interaction.reply({
          content: `✅ Tramo agregado: **${etiqueta}** (${min.toLocaleString()} - ${
            max ? max.toLocaleString() : '∞'
          }) → ${rol}`,
          ephemeral: true,
        });
      }

      case 'fama-listar': {
        const { data, error } = await supabase
          .from('fame_tier_roles')
          .select('*')
          .eq('guild_id', guildId)
          .order('sort_order', { ascending: true });

        if (error) {
          return interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
        }
        if (!data || data.length === 0) {
          return interaction.reply({
            content: 'No hay tramos de fama configurados todavía. Usa `/config fama-agregar`.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('Tramos de fama configurados')
          .setColor(0x5865f2)
          .setDescription(
            data
              .map(
                (t) =>
                  `**${t.label}** — ${t.min_fame.toLocaleString()} a ${
                    t.max_fame ? t.max_fame.toLocaleString() : '∞'
                  } → <@&${t.role_id}>`
              )
              .join('\n')
          );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'fama-eliminar': {
        const etiqueta = interaction.options.getString('etiqueta');
        const { error, count } = await supabase
          .from('fame_tier_roles')
          .delete({ count: 'exact' })
          .eq('guild_id', guildId)
          .eq('label', etiqueta);

        if (error) {
          return interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
        }
        if (!count) {
          return interaction.reply({
            content: `No encontré ningún tramo con la etiqueta "${etiqueta}".`,
            ephemeral: true,
          });
        }
        return interaction.reply({ content: `🗑️ Tramo "${etiqueta}" eliminado.`, ephemeral: true });
      }

      default:
        return interaction.reply({ content: 'Subcomando no reconocido.', ephemeral: true });
    }
  },
};
