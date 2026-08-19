const { supabase } = require('./supabase');

const TX_TYPES = { SPLIT: 'split', PAYMENT: 'payment', ADJUSTMENT: 'adjustment', MANUAL: 'manual' };

/** Obtiene (y crea si hace falta) la wallet de un usuario. */
async function getWallet(discordId, guildId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('discord_id', discordId)
    .eq('guild_id', guildId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: insErr } = await supabase
    .from('wallets')
    .insert({ discord_id: discordId, guild_id: guildId, balance: 0 })
    .select('*')
    .single();

  if (insErr) throw insErr;
  return created;
}

/**
 * Suma (amount > 0) o resta (amount < 0) una cantidad al saldo.
 * Si existe una wallet y el saldo quedó en 0, se conserva. Registra la transacción.
 */
async function changeBalance({ guildId, discordId, amount, type, referenceId = null, reason = null, executedBy = null, fromDiscordId = null }) {
  const wallet = await getWallet(discordId, guildId);
  const prev = Number(wallet.balance || 0);
  const newBalance = prev + Number(amount);

  const revert = () =>
    supabase
      .from('wallets')
      .update({ balance: prev, updated_at: wallet.updated_at || new Date().toISOString() })
      .eq('discord_id', discordId)
      .eq('guild_id', guildId)
      .then(() => {})
      .catch(() => {});

  const upd = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('discord_id', discordId)
    .eq('guild_id', guildId);
  if (upd.error) throw upd.error;

  const ins = await supabase.from('transactions').insert({
    guild_id: guildId,
    from_discord_id: fromDiscordId,
    to_discord_id: discordId,
    amount: Number(amount),
    type,
    reference_id: referenceId,
    reason,
    executed_by: executedBy,
  });
  if (!ins.error) return { newBalance };

  // Duplicado (mismo split ya acreditado): revertir la wallet y no romper el flujo.
  // Puede pasar si otra instancia del bot (deploy viejo) procesa la misma interacción.
  if (ins.error.code === '23505') {
    await revert();
    return { newBalance: prev, duplicate: true };
  }

  // Cualquier otro error: dejar la wallet como estaba y lanzar.
  await revert();
  throw ins.error;
}

/**
 * Pago manual del tesorero: RESTA del saldo pendiente por cobrar.
 * allowNegative permite que quede en negativo (adelanto).
 */
async function payUser({ guildId, target, amount, reason, executedBy }) {
  const wallet = await getWallet(target, guildId);
  const current = Number(wallet.balance || 0);
  const amountNum = Number(amount);
  const allowNegative = amountNum > current;

  await changeBalance({
    guildId,
    discordId: target,
    amount: -amountNum,
    type: TX_TYPES.PAYMENT,
    reason,
    executedBy,
  });

  return { current, newBalance: current - amountNum, allowNegative };
}

/** Historial de movimientos de un usuario (splits, pagos, ajustes). */
async function getTransactionHistory(discordId, options = {}) {
  let q = supabase
    .from('transactions')
    .select('*')
    .eq('to_discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(options.limit || 25);

  if (options.guildId) q = q.eq('guild_id', options.guildId);
  if (options.type) q = q.eq('type', options.type);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

module.exports = { getWallet, changeBalance, payUser, getTransactionHistory, TX_TYPES };