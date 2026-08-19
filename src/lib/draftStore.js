/**
 * Estado en memoria del borrador de un split mientras se arma
 * (participantes detectados en voz -> modal de monto -> finalizar).
 * Clave: `${guildId}:${userId}`.
 */
const drafts = new Map();

function keyOf(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getDraft(guildId, userId) {
  return drafts.get(keyOf(guildId, userId));
}

function saveDraft(guildId, userId, draft) {
  drafts.set(keyOf(guildId, userId), {
    createdAt: Date.now(),
    ...draft,
    guildId,
    userId,
  });
}

function clearDraft(guildId, userId) {
  drafts.delete(keyOf(guildId, userId));
}

// limpieza periódica de drafts viejos (>30 min)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of drafts) {
    if (now - v.createdAt > 30 * 60_000) drafts.delete(k);
  }
}, 10 * 60_000).unref();

module.exports = { getDraft, saveDraft, clearDraft, keyOf };