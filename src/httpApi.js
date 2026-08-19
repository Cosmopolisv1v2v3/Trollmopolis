const http = require('node:http');
const { ChannelType } = require('discord.js');

/**
 * Mini API HTTP que expone quiénes están conectados a los canales de voz
 * de cada guild. La WEB la consulta para precargar los participantes de un
 * split (bot y web corren por separado, así que hace falta esta puente).
 *
 * Seguridad: cada request debe llevar el header
 *   Authorization: Bearer <BOT_API_SECRET>
 * Si BOT_API_SECRET no está seteado, el servidor no arranca.
 */

function voicesForGuild(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { ok: false, status: 404, json: { error: 'Guild no encontrado.' } };

  const voiceChannels = guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildVoice)
    .map((ch) => ({
      id: ch.id,
      name: ch.name,
      members: (ch.members || [])
        .filter((m) => !m.user.bot)
        .map((m) => ({
          discord_id: m.id,
          tag: m.user.tag,
          display_name: m.displayName || m.user.username,
        })),
    }));

  return {
    ok: true,
    json: {
      guild_id: guild.id,
      guild_name: guild.name,
      channels: voiceChannels,
    },
  };
}

function handleRequest(client, req, res, secret) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const auth = req.headers.authorization || '';
  const expected = `Bearer ${secret}`;

  if (auth !== expected) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No autorizado.' }));
    return;
  }

  if (url.pathname === '/api/voice' && req.method === 'GET') {
    const guildId = url.searchParams.get('guildId');
    if (!guildId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falta guildId.' }));
      return;
    }
    const result = voicesForGuild(client, guildId);
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.json));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada.' }));
}

/**
 * Levanta el servidor HTTP. `client` es la instancia de discord.js.
 */
function startHttpServer(client) {
  const secret = process.env.BOT_API_SECRET;
  if (!secret) {
    console.warn('⚠️  BOT_API_SECRET no está configurado: el endpoint de voz (/api/voice) quedará desactivado.');
    return null;
  }

  const port = Number(process.env.BOT_API_PORT || process.env.PORT || 3001);
  const server = http.createServer((req, res) => {
    try {
      handleRequest(client, req, res, secret);
    } catch (e) {
      console.error('Error en /api/voice:', e.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error interno.' }));
      }
    }
  });

  server.listen(port, () => {
    console.log(`🔌 API HTTP de voz escuchando en :${port} (protegida con token).`);
  });

  return server;
}

module.exports = { startHttpServer };