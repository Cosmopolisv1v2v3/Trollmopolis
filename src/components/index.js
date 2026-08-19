const registrar = require('./registrar');
const split = require('../commands/split');

// Mapa de handlers: clave = prefijo del customId
const BUTTONS = {
  ...registrar,
  ...split.buttons,
};
const SELECTS = {
  ...registrar,
  ...split.selects,
};
const MODALS = {
  ...split.modals,
};

function route(type, interaction) {
  const id = interaction.customId;
  const pool = type === 'select' ? SELECTS : type === 'modal' ? MODALS : BUTTONS;
  const keys = Object.keys(pool);
  // exact match first (e.g. 'reg:cancel'), then prefix matches
  const exact = pool[id];
  if (exact) return exact(interaction, id);
  for (const k of keys) {
    if (id.startsWith(k)) return pool[k](interaction, id);
  }
  console.warn(`Componente sin handler: ${id}`);
  return interaction
    .reply({ content: 'Interacción no reconocida.', ephemeral: true })
    .catch(() => {});
}

module.exports = { route };