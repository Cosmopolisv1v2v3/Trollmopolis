require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.GuildMember],
});

const GUILD_ID = '1521190903824519320';

// roles a garantizar en el server: [nombre, color, sort_order si es de fama]
const ROLES = [
  { name: 'Tesorero', color: 0xf1c40f },
  { name: 'Splits Manager', color: 0x3498db },
  { name: 'Novato', color: 0x95a5a6, min: 0, max: 50_000_000, sort: 1 },
  { name: 'Miembro Activo', color: 0x2ecc71, min: 50_000_000, max: 150_000_000, sort: 2 },
  { name: 'Veterano', color: 0x3498db, min: 150_000_000, max: 500_000_000, sort: 3 },
  { name: 'Élite', color: 0x9b59b6, min: 500_000_000, max: 1_500_000_000, sort: 4 },
  { name: 'Leyenda', color: 0xe67e22, min: 1_500_000_000, max: 4_000_000_000, sort: 5 },
  { name: 'Mítico', color: 0xe74c3c, min: 4_000_000_000, max: null, sort: 6 },
];

// canales ya existentes en el server (nombres evidentes)
const CHANNELS = {
  welcome_channel_id: '1521190904881217649', // #『👋』ʙɪᴇɴᴠᴇɴɪᴅᴀ
  split_channel_id: '1539380935647301773',   // #split
  log_channel_id: '1539381167319683112',     // #logs
  registro_channel_id: '1539381110881132666',// #miembros
  counter_channel_id: null,                  // sin canal contador: configurar con /config contador
};

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('El bot no está en el server', GUILD_ID);
    process.exit(1);
  }

  const existing = guild.roles.cache;
  const created = {};

  for (const def of ROLES) {
    const role = existing.find((r) => r.name === def.name);
    if (role) {
      created[def.name] = role.id;
      console.log(`✓ Rol existente: ${def.name} (${role.id})`);
    } else {
      const nr = await guild.roles.create({
        name: def.name,
        color: def.color,
        mentionable: true,
        reason: 'Bootstrap Cosmopolis Bot',
      });
      created[def.name] = nr.id;
      console.log(`+ Rol creado: ${def.name} (${nr.id})`);
    }
  }

  // ATENCIÓN: subir el rol del bot por encima de los roles que debe gestionar
  const botRole = guild.roles.cache.get(guild.members.me.roles.highest.id);
  const targetPositions = Object.values(created).map((id) => guild.roles.cache.get(id)?.position);

  // --- persistir guild_settings ---
  const { supabase } = require('../src/lib/supabase');
  const row = {
    guild_id: GUILD_ID,
    ...CHANNELS,
    member_role_id: existing.find((r) => r.name === 'Miembro')?.id ?? created['Novato'],
    alliance_role_id: existing.find((r) => r.name === 'Ally')?.id ?? null,
    treasurer_role_id: created['Tesorero'],
    splits_manager_role_id: created['Splits Manager'],
    albion_guild_id: 'l_JjTJP6SMOEKSw-OfF8sA',
    albion_guild_name: 'COSMOPOLIS',
    albion_region: 'america',
    nick_prefix: 'Cosm',
  };

  const { error: upsertErr } = await supabase.from('guild_settings').upsert(row);
  if (upsertErr) {
    console.error('❌ No pude guardar guild_settings:', upsertErr.message);
  } else {
    console.log('✓ guild_settings guardado');
  }

  // --- tramos de fama (idempotente) ---
  const { error: delErr } = await supabase.from('fame_tier_roles').delete().eq('guild_id', GUILD_ID);
  if (delErr) console.error('⚠️ borrando tramos viejos:', delErr.message);

  const tiers = ROLES.filter((r) => r.min !== undefined).map((r) => ({
    guild_id: GUILD_ID,
    role_id: created[r.name],
    label: r.name,
    min_fame: r.min,
    max_fame: r.max ?? null,
    sort_order: r.sort,
  }));
  const { error: tierErr } = await supabase.from('fame_tier_roles').insert(tiers);
  if (tierErr) {
    console.error('❌ No pude guardar tramos de fama:', tierErr.message);
  } else {
    console.log('✓ Tramos de fama guardados', tiers.length);
  }

  console.log('\n⚠️  IMPORTANTE: mové el rol del bot ("BOTs" / Trollmopolis) a la POSICIÓN MÁS ALTA en Configuración del servidor.');
  if (botRole) {
    console.log(`    El rol del bot está hoy en posición ${botRole.position}; los roles a gestionar están por encima.`);
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch((e) => {
  console.error('Login error:', e.message);
  process.exit(1);
});