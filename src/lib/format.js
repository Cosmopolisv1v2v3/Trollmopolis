const { EmbedBuilder } = require('discord.js');

/** 1234567 -> "1.234.567" */
function fmtSilver(n) {
  return Number(n || 0).toLocaleString('en-US').replace(/,/g, '.');
}

/** 123000000 -> "123 M" ; 4700000000 -> "4,70 B" */
function fmtFame(n) {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })} B`;
  if (n >= 1e6) return `${Math.round(n / 1e6).toLocaleString('en-US')} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString('en-US')} K`;
  return `${n}`;
}

/** "Cosm-Nombre" a partir del prefijo configurado */
function buildNick(prefix, albionName) {
  const p = (prefix || 'Cosm').replace(/-+$/, '');
  return `${p}-${albionName}`;
}

/** Encuentra el tramo de fama que aplica a una fama dada. */
function findTier(tiers, fame) {
  return tiers.find(
    (t) => fame >= t.min_fame && (t.max_fame == null || fame <= t.max_fame)
  );
}

/** Pinta el embed enriquecido del registro (dato completo del player). */
function buildRegistrationEmbed(details, opts = {}) {
  const fameTier =
    opts.fameTier !== undefined
      ? opts.fameTier
      : '—';
  const tierValue = opts.fameTierRole
    ? `**${fameTier}**\n<@&${opts.fameTierRole}>`
    : fameTier;
  const avatar = details.Avatar || opts.avatar || null;
  const thumbnail = avatar && /^https?:\/\//i.test(avatar) ? avatar : null;
  return new EmbedBuilder()
    .setTitle(opts.title || '📋 Registro en Cosmopolis')
    .setThumbnail(thumbnail)
    .setColor(opts.memberType === 'alianza' ? 0x9b59b6 : 0x2ecc71)
    .addFields(
      { name: '👤 Personaje', value: `**${details.Name ?? '—'}**`, inline: true },
      { name: '🛡️ Gremio', value: details.GuildName || '—', inline: true },
      { name: '🤝 Alianza', value: details.AllianceName || '—', inline: true },
      { name: '⚔️ Fama de caza', value: fmtFame(details.KillFame), inline: true },
      { name: '💀 Fama de muerte', value: fmtFame(details.DeathFame), inline: true },
      { name: '📈 IP promedio', value: details.AverageItemPower ? `${Math.round(details.AverageItemPower)}` : '—', inline: true },
      { name: '🏆 Tramo de fama', value: tierValue, inline: true },
      { name: '🎖️ Tipo', value: opts.memberType === 'alianza' ? 'Alianza' : 'Miembro', inline: true },
      { name: '📛 Nick en Discord', value: opts.nick ? `\`${opts.nick}\`` : '—', inline: true },
      { name: '📅 Fecha de registro', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    );
}

/** Pinta el embed resumen de un split. */
function buildSplitEmbed(split, participants = []) {
  const emb = new EmbedBuilder()
    .setTitle(`💰 Split #${split.id.slice(0, 6)}`)
    .setColor(0xf1c40f)
    .setDescription(
      `Total: **${fmtSilver(split.total_amount)}** · Impuesto: **${split.tax_percent}%**\n` +
        `Neto repartible: **${fmtSilver(split.net_amount)}** · Loot: **${split.loot_location || 's/n'}**`
    )
    .addFields({
      name: `🧾 Participantes (${participants.length})`,
      value:
        participants.length === 0
          ? '—'
          : participants
              .map((p, i) => `**${i + 1}.** ${p.discord_tag || p.name} — \`${fmtSilver(p.amount)}\``)
              .join('\n'),
    });

  if (split.created_at) {
    emb.addFields({
      name: '🕐 Fecha',
      value: `<t:${Math.floor(new Date(split.created_at).getTime() / 1000)}:F>`,
      inline: true,
    });
  }
  if (split.created_by_tag) {
    emb.setFooter({ text: `Creado por ${split.created_by_tag}` });
  }
  if (split.status === 'locked') emb.setFooter({ text: '🔒 Split cerrado (no editable)' });
  if (split.status === 'cancelled') emb.setColor(0xe74c3c).setFooter({ text: '❌ Split cancelado' });

  return emb;
}

module.exports = { fmtSilver, fmtFame, buildNick, findTier, buildRegistrationEmbed, buildSplitEmbed };