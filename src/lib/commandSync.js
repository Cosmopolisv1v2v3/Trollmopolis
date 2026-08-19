require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

/** Comandos que se ocultan cuando config_completed = true. */
const HIDDEN_WHEN_LOCKED = ['config', 'setup-roles', 'ping'];

/** Carga la lista completa de comandos desde src/commands. */
function loadAllCommandsData() {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  const list = [];
  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if (!command?.data?.name) continue;
    list.push({ name: command.data.name, data: command.data.toJSON() });
  }
  return list;
}

/**
 * Registra (o re-registra) los comandos de UN servidor según la config.
 * Cuando configCompleted = true se ocultan los comandos de HIDDEN_WHEN_LOCKED.
 * Devuelve { visible, hidden }.
 */
async function syncCommandsForGuild(guildId, configCompleted = false) {
  const all = loadAllCommandsData();
  const lock = !!configCompleted;

  const hidden = lock ? all.filter((c) => HIDDEN_WHEN_LOCKED.includes(c.name)) : [];
  const visible = lock ? all.filter((c) => !HIDDEN_WHEN_LOCKED.includes(c.name)) : all;

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId), {
    body: visible.map((c) => c.data),
  });

  return {
    visible: visible.map((c) => c.name),
    hidden: hidden.map((c) => c.name),
  };
}

module.exports = { syncCommandsForGuild, loadAllCommandsData, HIDDEN_WHEN_LOCKED };