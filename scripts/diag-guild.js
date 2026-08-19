require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', async () => {
  for (const guild of client.guilds.cache.values()) {
    console.log(`\n=== GUILD: "${guild.name}" (${guild.id}) — ownerId: ${guild.ownerId}`);
    console.log(`memberCount: ${guild.memberCount} | approximate: ${guild.approximateMemberCount ?? 'n/a'}`);

    const me = guild.members.me;
    console.log(`Bot member: ${me?.user.tag}`);
    console.log(`Bot highest role position: ${me?.roles.highest.position ?? '?'} (${me?.roles.highest.name ?? '?'})`);
    console.log(`Bot permissions bits: ${me?.permissions.toArray().join(', ') || 'none'}`);

    console.log('\n-- Roles (position | name | id) --');
    const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
    for (const r of roles) console.log(`${r.position} | "${r.name}" | ${r.id}`);

    console.log('\n-- Canales de texto --');
    for (const c of guild.channels.cache.values()) {
      if (c.type === 0) console.log(`#${c.name} | ${c.id}`);
    }
    console.log('\n-- Canales de voz --');
    for (const c of guild.channels.cache.values()) {
      if (c.type === 2) console.log(`🔊 ${c.name} | ${c.id}`);
    }
  }
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch((e) => {
  console.error('Login error:', e.message);
  process.exit(1);
});