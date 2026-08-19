/**
 * Estado del borrador de un split mientras se arma
 * (participantes detectados en voz -> modal de monto -> finalizar).
 * Clave: `${guildId}:${userId}`.
 *
 * Persistido en la tabla `split_drafts` (Supabase) para que los drafts
 * sobrevivan reinicios/cambios de instancia del bot. El TTL es de 30 min.
 */
const { supabase } = require('./supabase');

const TTL_MS = 30 * 60_000;
const TABLE = 'split_drafts';

function keyOf(guildId, userId) {
  return `${guildId}:${userId}`;
}

async function getDraft(guildId, userId) {
  const key = keyOf(guildId, userId);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  const expired = Date.now() - new Date(data.created_at).getTime() > TTL_MS;
  if (expired) {
    await supabase.from(TABLE).delete().eq('key', key).catch(() => {});
    return null;
  }
  return { ...data.data, guildId, userId, ownerId: data.owner_id };
}

async function saveDraft(guildId, userId, draft) {
  const key = keyOf(guildId, userId);
  const row = {
    key,
    owner_id: userId,
    guild_id: guildId,
    data: { ...draft },
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'key' });
  // si el upsert pide más permisos de los que tiene el role... error se ignora aquí
  return !error;
}

async function clearDraft(guildId, userId) {
  const key = keyOf(guildId, userId);
  await supabase.from(TABLE).delete().eq('key', key).catch(() => {});
}

module.exports = { getDraft, saveDraft, clearDraft, keyOf };