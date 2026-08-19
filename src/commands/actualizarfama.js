const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { supabase } = require('../lib/supabase');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { getPlayerDetail } = require('../lib/albion');
const { findTier, fmtFame } = require('../lib/format');
const { isSplitsManager } = require('../lib/permissions');
const { postFamaEmbed } = require('../lib/famaChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('actualizarfama')
    .setDescription('Verifica si la fama de un usuario cambió en Albion y le asigna el rol que corresponde.')
    .addUserOption((o) =>
      o
        .setName('usuario')
        .setDescription('Usuario a actualizar (por defecto: vos). Los demás solo staff.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;
    const settings = await getOrCreateGuildSettings(guildId);
    const target = interaction.options.getUser('usuario') || interaction.user;

    if (target.id !== interaction.user.id && !isSplitsManager(interaction, settings)) {
      return interaction.editReply(
        '❌ Actualizar la fama de otro usuario requiere ser **Tesorero**, **Splits Manager** o Administrador.'
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', target.id)
      .eq('guild_id', guildId)
      .maybeSingle();

    if (!user) {
      return interaction.editReply(
        `❌ **${target.tag}** no está registrado en el sistema. Que use \`/registrar\` primero.`
      );
    }
    if (!user.albion_id) {
      return interaction.editReply(
        `❌ **${target.tag}** no tiene un personaje de Albion vinculado. Que use \`/registrar\`.` 
      );
    }

    const region = settings.albion_region || 'america';
    let details;
    try {
      details = await getPlayerDetail(region, user.albion_id);
    } catch (err) {
      return interaction.editReply(
        `❌ No pude consultar la API de Albion (${region.toUpperCase()}): ${err.message}`
      );
    }

    const beforeFame = user.kill_fame ?? 0;
    const fama = details.KillFame ?? 0;

    const { data: tiers } = await supabase
      .from('fame_tier_roles')
      .select('*')
      .eq('guild_id', guildId)
      .order('sort_order', { ascending: true });
    const tier = findTier(tiers || [], fama);
    const wasTier = user.fame_tier;

    // --- ajustar roles: quitar el(s) rol(es) viejo(s) de tramo y poner el correcto ---
    const tierRoleIds = (tiers || []).map((t) => t.role_id).filter(Boolean);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    let roleChanged = false;
    if (member?.manageable && tierRoleIds.length) {
      const toRemove = member.roles.cache
        .filter((r) => tierRoleIds.includes(r.id))
        .map((r) => r.id);
      if (toRemove.length) {
        await member.roles
          .remove(toRemove, 'Actualización de fama (Cosmopolis Bot)')
          .catch((e) => console.warn(`No pude quitar roles de ${target.tag}: ${e.message}`));
        roleChanged = true;
      }
      if (tier?.role_id && !member.roles.cache.has(tier.role_id)) {
        await member.roles
          .add(tier.role_id, 'Actualización de fama (Cosmopolis Bot)')
          .catch((e) => console.warn(`No pude agregar rol a ${target.tag}: ${e.message}`));
        roleChanged = true;
      }
    }

    const now = new Date().toISOString();
    await supabase
      .from('users')
      .update({
        albion_name: details.Name || user.albion_name,
        kill_fame: fama,
        death_fame: details.DeathFame ?? 0,
        ip_average: details.AverageItemPower ?? user.ip_average,
        guild_name_albion: details.GuildName || null,
        fame_tier: tier?.label ?? null,
        last_synced_at: now,
        updated_at: now,
      })
      .eq('discord_id', target.id)
      .eq('guild_id', guildId);

    const famaChanged = fama !== beforeFame;
    const tierChanged = (tier?.label ?? null) !== wasTier;

    const emb = new EmbedBuilder()
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
      .setColor(tierChanged ? 0xf1c40f : 0x2ecc71)
      .setTitle('📊 Fama actualizada')
      .setDescription(
        `${target} sincronizó su fama desde la API de Albion.\n` +
          `Fama de caza: **${fmtFame(beforeFame)}** → **${fmtFame(fama)}**\n` +
          `Tramo: **${wasTier || '—'}** → **${tier?.label || '—'}**` +
          (tier?.role_id ? `\nRol: <@&${tier.role_id}>` : '')
      );

    if (!famaChanged && !tierChanged) {
      emb.setFooter({ text: 'No hubo cambios respecto a la última sincronización.' });
    }

    // --- embed público con la info de la API en el canal de fama ---
    await postFamaEmbed({
      interaction,
      settings,
      details,
      opts: {
        memberType: user.member_type,
        fameTier: tier?.label || '—',
        fameTierRole: tier?.role_id,
        title: roleChanged ? '🏆 Fama actualizada — rol ajustado' : '📊 Fama actualizada',
        nick: user.display_nick,
      },
    });

    return interaction.editReply({ embeds: [emb] });
  },
};