require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { startHttpServer } = require('./httpApi');

if (!process.env.DISCORD_TOKEN) {
  throw new Error('Falta DISCORD_TOKEN en las variables de entorno.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privilegiado: activar en el Developer Portal
    GatewayIntentBits.GuildVoiceStates, // no privilegiado, necesario para detectar quién está en voz (splits)
  ],
  partials: [Partials.GuildMember],
});

// --- Cargar comandos ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command?.data?.name || typeof command.execute !== 'function') {
    console.warn(`⚠️  ${file} no exporta { data, execute } válido, se ignora.`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

// --- Cargar eventos ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(process.env.DISCORD_TOKEN);

// Endpoint HTTP para que la web consulte quién está en voz (splits desde web).
startHttpServer(client);
