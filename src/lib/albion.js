// Hosts oficiales de la Gameinfo API de Albion Online por región.
const REGIONS = [
  { region: 'america', host: 'https://gameinfo.albiononline.com/api/gameinfo' },
  { region: 'europe', host: 'https://gameinfo-ams.albiononline.com/api/gameinfo' },
  { region: 'asia', host: 'https://gameinfo-sgp.albiononline.com/api/gameinfo' },
];

/**
 * Busca un nombre de guild en las 3 regiones de Albion en paralelo
 * y devuelve TODAS las coincidencias (name match, no exacto todavía),
 * cada una etiquetada con su región. El caller decide si hay una sola
 * coincidencia exacta o si debe mostrar un menú de selección.
 */
async function searchGuildAllRegions(name) {
  const results = await Promise.allSettled(
    REGIONS.map(async ({ region, host }) => {
      const res = await fetch(`${host}/search?q=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Albion API (${region}) respondió ${res.status}`);
      const json = await res.json();
      return (json.guilds ?? []).map((g) => ({
        region,
        id: g.Id,
        name: g.Name,
        allianceName: g.AllianceName || null,
        killFame: g.KillFame ?? null,
        deathFame: g.DeathFame ?? null,
      }));
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

/**
 * Igual que searchGuildAllRegions pero filtrando por coincidencia
 * EXACTA de nombre (case-insensitive). Útil para /config albion-guild
 * cuando ya se conoce el nombre exacto del gremio.
 */
async function findGuildExact(name) {
  const all = await searchGuildAllRegions(name);
  return all.filter((g) => g.name.toLowerCase() === name.toLowerCase());
}

/** Busca un jugador por nombre SOLO en una región (para /registrar). */
async function searchPlayerInRegion(name, region) {
  const host = REGIONS.find((r) => r.region === region)?.host;
  if (!host) throw new Error(`Región inválida: ${region}`);
  const res = await fetch(`${host}/search?q=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Albion API (${region}) respondió ${res.status}`);
  const json = await res.json();
  return (json.players ?? []).map((p) => ({
    region,
    id: p.Id,
    name: p.Name,
    guildName: p.GuildName || null,
    allianceName: p.AllianceName || null,
    killFame: p.KillFame ?? null,
    deathFame: p.DeathFame ?? null,
    fameRatio: p.FameRatio ?? null,
  }));
}

/** Busca un jugador por nombre en las 3 regiones (para /registrar). */
async function searchPlayerAllRegions(name) {
  const results = await Promise.allSettled(
    REGIONS.map(async ({ region, host }) => {
      const res = await fetch(`${host}/search?q=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Albion API (${region}) respondió ${res.status}`);
      const json = await res.json();
      return (json.players ?? []).map((p) => ({
        region,
        id: p.Id,
        name: p.Name,
        guildName: p.GuildName || null,
        allianceName: p.AllianceName || null,
        killFame: p.KillFame ?? null,
        deathFame: p.DeathFame ?? null,
        fameRatio: p.FameRatio ?? null,
      }));
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

/** Trae el detalle completo de un player por su ID + región conocida. */
async function getPlayerDetail(region, playerId) {
  const host = REGIONS.find((r) => r.region === region)?.host;
  if (!host) throw new Error(`Región inválida: ${region}`);
  const res = await fetch(`${host}/players/${playerId}`);
  if (!res.ok) throw new Error(`Albion API (${region}) respondió ${res.status}`);
  return res.json();
}

module.exports = {
  searchGuildAllRegions,
  findGuildExact,
  searchPlayerAllRegions,
  searchPlayerInRegion,
  getPlayerDetail,
};
