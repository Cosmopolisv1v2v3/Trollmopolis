const { supabase } = require('./supabase');
const { changeBalance, getWallet, TX_TYPES } = require('./banking');

const SPLIT_LOCK_MINUTES = 10;

/** Crea el split, acredita a cada participante y registra las transacciones. */
async function createSplit({ guildId, createdBy, participants, totalAmount, taxPercent, lootLocation }) {
  const tax = Math.max(0, Math.min(100, Number(taxPercent) || 0));
  const total = Math.round(Number(totalAmount) || 0);
  if (Math.round(total * (1 - tax / 100)) <= 0) {
    throw new Error('El monto neto (tras impuesto) debe ser mayor a 0.');
  }
  if (!participants.length) throw new Error('Debe haber al menos un participante.');
  if (participants.length > 100) throw new Error('Máximo 100 participantes por split.');

  // net_amount es columna GENERADA en la BD (floor(total * (1 - tax/100)));
  // insertamos sin ella y la leemos del resultado para repartir.
  const { data: split, error: splitErr } = await supabase
    .from('splits')
    .insert({
      guild_id: guildId,
      created_by: createdBy,
      total_amount: total,
      tax_percent: tax,
      loot_location: lootLocation || null,
      status: 'open',
    })
    .select('*')
    .single();
  if (splitErr) throw splitErr;

  const netAmount = Number(split.net_amount);
  const perPerson = Math.floor(netAmount / participants.length);

  const rows = participants.map((p) => ({
    split_id: split.id,
    discord_id: p.discord_id,
    amount: perPerson,
    added_manually: !!p.added_manually,
  }));

  // Idempotente por (split_id, discord_id): si otra instancia procesa la misma
  // interacción, no duplica la fila del participante.
  const { error: partErr } = await supabase
    .from('split_participants')
    .upsert(rows, { onConflict: 'split_id,discord_id', ignoreDuplicates: true });
  if (partErr) throw partErr;

  for (const p of participants) {
    await changeBalance({
      guildId,
      discordId: p.discord_id,
      amount: perPerson,
      type: TX_TYPES.SPLIT,
      referenceId: split.id,
      reason: `Split #${split.id.slice(0, 6)} — ${lootLocation || 'loot sin ubicación'}`,
      executedBy: createdBy,
    });
  }

  return { split, perPerson };
}

/** Trae un split con sus participantes y las etiquetas de usuario. */
async function getSplitWithParticipants(splitId) {
  const { data: split, error } = await supabase
    .from('splits')
    .select('*')
    .eq('id', splitId)
    .single();
  if (error) throw error;

  const { data: parts, error: pErr } = await supabase
    .from('split_participants')
    .select('*')
    .eq('split_id', splitId);
  if (pErr) throw pErr;

  return { split, participants: parts || [] };
}

/** Bloquea un split (ej. pasó el tiempo de edición). */
async function lockSplit(splitId) {
  const { data, error } = await supabase
    .from('splits')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('id', splitId)
    .eq('status', 'open')
    .select('*')
    .single();
  if (error) throw error;
  return data || null;
}

/**
 * Ajuste post-split (o dentro de la ventana): mueve plata de/para un jugador.
 * amountDelta > 0 acredita; amountDelta < 0 descuenta. Siempre requiere motivo.
 */
async function adjustSplit({ splitId, discordId, amountDelta, reason, adjustedBy, guildId }) {
  if (!reason || reason.trim().length < 3) throw new Error('El motivo es obligatorio (mín. 3 caracteres).');
  const delta = Math.round(Number(amountDelta) || 0);
  if (!delta) throw new Error('El monto del ajuste no puede ser 0.');

  const { split } = await getSplitWithParticipants(splitId);
  const { error: adjErr } = await supabase.from('split_adjustments').insert({
    split_id: splitId,
    discord_id: discordId,
    amount_delta: delta,
    reason: reason.trim(),
    adjusted_by: adjustedBy,
  });
  if (adjErr) throw adjErr;

  await changeBalance({
    guildId: guildId || split.guild_id,
    discordId,
    amount: delta,
    type: TX_TYPES.ADJUSTMENT,
    referenceId: splitId,
    reason: `Ajuste split #${splitId.slice(0, 6)} — ${reason.trim()}`,
    executedBy: adjustedBy,
  });
}

/** Cancela un split dentro de la ventana (resta a quienes habían sido acreditados). */
async function cancelSplit({ splitId, reason, cancelledBy }) {
  if (!reason || reason.trim().length < 3) throw new Error('El motivo de cancelación es obligatorio.');
  const { split, participants } = await getSplitWithParticipants(splitId);
  if (split.status !== 'open') throw new Error('Solo se pueden cancelar splits en ventana de edición (open).');

  const { error: updErr } = await supabase
    .from('splits')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: reason.trim() })
    .eq('id', splitId);
  if (updErr) throw updErr;

  for (const p of participants) {
    await changeBalance({
      guildId: split.guild_id,
      discordId: p.discord_id,
      amount: -p.amount,
      type: TX_TYPES.ADJUSTMENT,
      referenceId: splitId,
      reason: `Split #${splitId.slice(0, 6)} cancelado — ${reason.trim()}`,
      executedBy: cancelledBy,
    });
  }
}

/** Paga un split completo: descuenta a cada participante lo que se le acreditó. */
async function paySplitComplete({ splitId, paidBy }) {
  const { split, participants } = await getSplitWithParticipants(splitId);
  if (split.status !== 'open' && split.status !== 'locked') {
    throw new Error('Solo se puede pagar un split abierto (open) o cerrado (locked).');
  }
  if (!participants.length) throw new Error('El split no tiene participantes.');

  let total = 0;
  const deduplicated = {};
  for (const p of participants) {
    deduplicated[p.discord_id] = (deduplicated[p.discord_id] || 0) + Number(p.amount);
  }
  for (const [discordId, amount] of Object.entries(deduplicated)) {
    await changeBalance({
      guildId: split.guild_id,
      discordId,
      amount: -amount,
      type: TX_TYPES.PAYMENT,
      referenceId: splitId,
      reason: `Split #${splitId.slice(0, 6)} pagado completo`,
      executedBy: paidBy,
    });
    total += amount;
  }

  const { error: updErr } = await supabase
    .from('splits')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', splitId)
    .eq('guild_id', split.guild_id);
  if (updErr) throw updErr;

  return { split, participants: Object.values(participants), total };
}

/** Búsqueda de splits de un gremio por prefijo del ID (para autocompletado). */
async function searchSplits({ guildId, prefix = '', limit = 25 }) {
  const { data, error } = await supabase
    .from('splits')
    .select('id, guild_id, status, created_at, total_amount, net_amount, loot_location')
    .eq('guild_id', guildId)
    .ilike('id', `${String(prefix).trim().toLowerCase()}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Historial de splits de un usuario (con transacciones asociadas). */
async function splitHistoryForUser(discordId, limit = 10) {
  const { data, error } = await supabase
    .from('split_participants')
    .select('*, splits(*)')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Asegura que el campo updated_at se actualice solo (triggers). */
function isWithinEditWindow(split) {
  if (!split || split.status !== 'open') return false;
  const lockAt = new Date(new Date(split.created_at).getTime() + SPLIT_LOCK_MINUTES * 60_000);
  return Date.now() < lockAt.getTime();
}

module.exports = {
  SPLIT_LOCK_MINUTES,
  createSplit,
  getSplitWithParticipants,
  lockSplit,
  adjustSplit,
  cancelSplit,
  paySplitComplete,
  splitHistoryForUser,
  searchSplits,
  isWithinEditWindow,
};