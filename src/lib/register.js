const { supabase } = require('./supabase');
const { getOrCreateGuildSettings } = require('./guildSettings');
const { getPlayerDetail } = require('./albion');
const { getWallet } = require('./banking');
const { buildNick, findTier } = require('./format');
const { revokeRegistroAccess } = require('./registroChannel');

const TIER_ROLE = 'fame_tier_roles';

/**
 * Convierte un resultado de búsqueda (region|id|name|guildName|killFame…)
 * al mismo "shape" que devuelve la Gameinfo API, para no tener que esperar
 * a getPlayerDetail cuando alcanza con los datos de la búsqueda.
 */
function toApiDetail(match) {
  return {
    Id: match.id,
    Name: match.name,
    GuildName: match.guildName ?? null,
    AllianceName: match.allianceName ?? null,
    KillFame: match.killFame ?? 0,
    DeathFame: match.deathFame ?? 0,
    AverageItemPower: null,
    Avatar: null,
    LifetimeStatistics: null,
  };
}

/**
 * Registra (o re-registra) un miembro. Este es el corazón del flujo:
 * trae el detalle del player, asigna roles/nickname, persiste y emite el embed.
 *
 * Si pasás `detailOverride` (un resultado de searchPlayerInRegion) no se
 * espera a la API: se usa lo que ya vino de la búsqueda.
 */
async function finalizeRegistration({ interaction, match, memberType, detailOverride }) {
  const guildId = interaction.guildId;
  const settings = await getOrCreateGuildSettings(guildId);
  const discordId = interaction.user.id;

  const details = detailOverride ? toApiDetail(detailOverride) : await getPlayerDetail(match.region, match.id);

  // --- tramo de fama (usa KillFame = fama de caza) ---
  const fama = details.KillFame ?? 0;
  const { data: tiers } = await supabase
    .from(TIER_ROLE)
    .select('*')
    .eq('guild_id', guildId)
    .order('sort_order', { ascending: true });
  const tier = findTier(tiers || [], fama);

  const prefix = settings.nick_prefix || 'Cosm';
  const nick = buildNick(prefix, details.Name || match.name);
  const now = new Date().toISOString();

  // --- datos para el embed enriquecido ---
  const stats = details.LifetimeStatistics || {};
  const totalFame =
    (stats.PvE?.Total || 0) +
    (stats.PvP?.Total || 0) +
    (stats.Gathering?.Total || 0) +
    (stats.Crafting?.Total || 0);
  const ip = stats.PvE?.AverageItemPower || details.AverageItemPower || null;

  // --- persistir user + wallet ---
  const { error: upsertErr } = await supabase
    .from('users')
    .upsert(
      {
        discord_id: discordId,
        guild_id: guildId,
        albion_id: match.id,
        albion_name: details.Name || match.name,
        display_nick: nick,
        member_type: memberType,
        kill_fame: fama,
        death_fame: details.DeathFame ?? 0,
        ip_average: ip,
        guild_name_albion: details.GuildName || null,
        fame_tier: tier?.label ?? null,
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: 'discord_id' }
    );
  if (upsertErr) throw upsertErr;
  await getWallet(discordId, guildId);

  // Ya registrado: ya no necesita (ni debe) ver el canal de registro.
  await revokeRegistroAccess(interaction.member).catch((e) =>
    console.warn(`No pude cerrar el canal de registro para ${discordId}: ${e.message}`)
  );

  // --- nickname en Discord (puede fallar por jerarquía de roles) ---
  let nickApplied = false;
  if (interaction.member.manageable) {
    try {
      await interaction.member.setNickname(nick, 'Registro en Cosmopolis');
      nickApplied = true;
    } catch (e) {
      console.warn(`No pude cambiar el nick de ${interaction.user.tag}: ${e.message}`);
    }
  }

  // --- roles ---
  const rolesToAdd = [];
  const memberRoleId =
    memberType === 'alianza' ? settings.alliance_role_id : settings.member_role_id;
  if (memberRoleId) rolesToAdd.push(memberRoleId);
  if (tier?.role_id) rolesToAdd.push(tier.role_id);

  if (rolesToAdd.length && interaction.member.manageable) {
    try {
      await interaction.member.roles.add(rolesToAdd, 'Registro en Cosmopolis');
    } catch (e) {
      console.warn(`No pude asignar roles a ${interaction.user.tag}: ${e.message}`);
    }
  }

  return {
    region: match.region,
    settings,
    details,
    nick,
    nickApplied,
    tier,
    fama,
    totalFame,
    ip,
    memberType,
    rolesAdded: rolesToAdd,
  };
}

module.exports = { finalizeRegistration };