require('dotenv').config();
const { Client } = require('pg');

const SQL = `
-- =====================================================================
-- Cosmopolis — schema idempotente (bot + web comparten esta BD)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. guild_settings
-- ---------------------------------------------------------------------
create table if not exists public.guild_settings (
  guild_id text primary key,
  welcome_channel_id text,
  counter_channel_id text,
  split_channel_id text,
  log_channel_id text,
  registro_channel_id text,
  fama_channel_id text,
  member_role_id text,
  alliance_role_id text,
  treasurer_role_id text,
  splits_manager_role_id text,
  albion_guild_id text,
  albion_guild_name text,
  albion_region text default 'america',
  nick_prefix text default 'Cosm',
  welcome_message text,               -- mensaje de bienvenida configurable (bot + web)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columnas que pueden faltar si la tabla ya existía de antes.
alter table public.guild_settings add column if not exists welcome_message text;
alter table public.guild_settings add column if not exists fama_channel_id text;

-- ---------------------------------------------------------------------
-- 2. fame_tier_roles
-- ---------------------------------------------------------------------
create table if not exists public.fame_tier_roles (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  role_id text not null,
  label text not null,
  min_fame bigint not null default 0,
  max_fame bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. users
-- ---------------------------------------------------------------------
create table if not exists public.users (
  discord_id text primary key,
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  auth_user_id uuid,                       -- link con auth.users (web login)
  albion_id text,
  albion_name text,
  display_nick text,
  member_type text check (member_type in ('miembro','alianza')),
  kill_fame bigint,
  death_fame bigint,
  ip_average numeric,
  guild_name_albion text,
  fame_tier text,
  is_treasurer boolean not null default false,
  is_splits_manager boolean not null default false,
  registered_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Columnas que pueden faltar si la tabla ya existía de antes.
alter table public.users add column if not exists is_treasurer boolean not null default false;
alter table public.users add column if not exists is_splits_manager boolean not null default false;
alter table public.users add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------
-- 4. wallets — saldo PENDIENTE POR COBRAR (lo que el gremio le debe)
-- ---------------------------------------------------------------------
create table if not exists public.wallets (
  discord_id text primary key references public.users(discord_id) on delete cascade,
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. splits
-- ---------------------------------------------------------------------
create table if not exists public.splits (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  created_by text not null references public.users(discord_id),
  total_amount bigint not null,
  tax_percent numeric not null default 0,
  net_amount bigint not null generated always as (floor((total_amount)::numeric * (1 - tax_percent / 100.0))) stored,
  loot_location text,
  status text not null default 'open' check (status in ('open','locked','cancelled','paid')),
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);
create index if not exists idx_splits_guild on public.splits(guild_id, created_at desc);

-- Ajustes en caso de una tabla ya existente.
alter table public.splits drop constraint if exists splits_status_check;
alter table public.splits add constraint splits_status_check check (status in ('open','locked','cancelled','paid'));
alter table public.splits add column if not exists paid_at timestamptz;

-- ---------------------------------------------------------------------
-- 6. split_participants
-- ---------------------------------------------------------------------
create table if not exists public.split_participants (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  discord_id text not null references public.users(discord_id),
  amount bigint not null,
  added_manually boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_split_parts_split on public.split_participants(split_id);
create index if not exists idx_split_parts_user on public.split_participants(discord_id);
-- Un jugador no puede figurar dos veces en el mismo split.
create unique index if not exists uq_split_part on public.split_participants(split_id, discord_id);

-- ---------------------------------------------------------------------
-- 7. split_adjustments
-- ---------------------------------------------------------------------
create table if not exists public.split_adjustments (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  discord_id text not null references public.users(discord_id),
  amount_delta bigint not null,
  reason text not null,
  adjusted_by text not null references public.users(discord_id),
  created_at timestamptz not null default now()
);
create index if not exists idx_adj_split on public.split_adjustments(split_id);

-- ---------------------------------------------------------------------
-- 8. transactions
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null references public.guild_settings(guild_id) on delete cascade,
  from_discord_id text,
  to_discord_id text not null references public.users(discord_id),
  amount bigint not null,
  type text not null check (type in ('split','payment','adjustment','manual')),
  reference_id uuid,
  reason text,
  executed_by text references public.users(discord_id),
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_user on public.transactions(to_discord_id, created_at desc);
create index if not exists idx_tx_guild on public.transactions(guild_id, created_at desc);

-- Evita acreditar el MISMO split a un usuario dos veces (splits tienen reference_id).
create unique index if not exists uq_tx_split_credit
  on public.transactions (reference_id, to_discord_id, type)
  where reference_id is not null;

-- ---------------------------------------------------------------------
-- 8b. split_drafts — borradores de split persistidos (sobreviven reinicios del bot)
-- ---------------------------------------------------------------------
create table if not exists public.split_drafts (
  key text primary key,
  owner_id text not null,
  guild_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_drafts_owner on public.split_drafts(owner_id);

-- ---------------------------------------------------------------------
-- RPC para la WEB (crear/ajustar splits). SECURITY DEFINER con chequeo
-- interno de staff + auth.uid(); solo así la web puede operar de forma
-- atómica (split + participantes + wallets + transacciones).
-- ---------------------------------------------------------------------
create or replace function public.create_split_rpc(
  p_total_amount bigint,
  p_tax_percent numeric default 0,
  p_loot_location text default null,
  p_participants text[] default '{}'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me public.users%rowtype;
  v_net bigint;
  v_per bigint;
  v_split_id uuid;
  v_discord text;
begin
  select * into me from public.users where auth_user_id = auth.uid();
  if me.discord_id is null then
    raise exception 'No estás registrado en el sistema. Usá /registrar en Discord primero.';
  end if;
  if not (me.is_treasurer or me.is_splits_manager) then
    raise exception 'No tenés permisos para crear splits.';
  end if;
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'El monto debe ser mayor a 0.';
  end if;
  if cardinality(coalesce(p_participants,'{}')) = 0 then
    raise exception 'Hay que elegir al menos un participante.';
  end if;
  if cardinality(p_participants) > 50 then
    raise exception 'Máximo 50 participantes.';
  end if;

  -- net_amount es GENERADO en la BD (floor(total * (1 - tax/100))); lo leemos del returning.
  insert into public.splits (guild_id, created_by, total_amount, tax_percent, loot_location, status)
  values (me.guild_id, me.discord_id, p_total_amount, coalesce(p_tax_percent,0), p_loot_location, 'open')
  returning id, net_amount into v_split_id, v_net;

  v_per := floor(v_net / cardinality(p_participants));

  foreach v_discord in array p_participants loop
    insert into public.split_participants (split_id, discord_id, amount, added_manually)
    values (v_split_id, v_discord, v_per, true);

    insert into public.wallets (discord_id, guild_id, balance)
    values (v_discord, me.guild_id, v_per)
    on conflict (discord_id) do update
      set balance = public.wallets.balance + v_per, updated_at = now();

    insert into public.transactions (guild_id, to_discord_id, amount, type, reference_id, reason, executed_by)
    values (me.guild_id, v_discord, v_per, 'split', v_split_id, 'Split creado desde la web', me.discord_id);
  end loop;

  return jsonb_build_object('split_id', v_split_id, 'per_person', v_per, 'net_amount', v_net);
end;
$$;

create or replace function public.adjust_split_rpc(
  p_split_id uuid,
  p_discord_id text,
  p_amount_delta bigint,
  p_reason text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  me public.users%rowtype;
  s public.splits%rowtype;
begin
  select * into me from public.users where auth_user_id = auth.uid();
  if me.discord_id is null then
    raise exception 'No estás registrado en el sistema.';
  end if;
  if not (me.is_treasurer or me.is_splits_manager) then
    raise exception 'No tenés permisos para ajustar splits.';
  end if;
  if length(coalesce(p_reason,'')) < 3 then
    raise exception 'El motivo es obligatorio (mínimo 3 caracteres).';
  end if;
  if p_amount_delta is null or p_amount_delta = 0 then
    raise exception 'El monto del ajuste no puede ser 0.';
  end if;

  select * into s from public.splits where id = p_split_id and guild_id = me.guild_id;
  if s.id is null then
    raise exception 'Split no encontrado en este gremio.';
  end if;
  if s.status = 'cancelled' then
    raise exception 'El split está cancelado, no se puede ajustar.';
  end if;

  insert into public.split_adjustments (split_id, discord_id, amount_delta, reason, adjusted_by)
  values (p_split_id, p_discord_id, p_amount_delta, p_reason, me.discord_id);

  insert into public.wallets (discord_id, guild_id, balance)
  values (p_discord_id, me.guild_id, p_amount_delta)
  on conflict (discord_id) do update
    set balance = public.wallets.balance + p_amount_delta, updated_at = now();

  insert into public.transactions (guild_id, to_discord_id, amount, type, reference_id, reason, executed_by)
  values (me.guild_id, p_discord_id, p_amount_delta, 'adjustment', p_split_id, p_reason, me.discord_id);
end;
$$;

-- Configuración del gremio desde la web (solo staff). Deriva la guild desde el JWT.
create or replace function public.update_guild_settings_rpc(
  p_guild_id text,
  p_albion_guild_name text,
  p_welcome_message text default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  me public.users%rowtype;
begin
  select * into me from public.users where auth_user_id = auth.uid();
  if me.discord_id is null then
    raise exception 'No estás registrado en el sistema.';
  end if;
  if not (me.is_treasurer or me.is_splits_manager) then
    raise exception 'No tenés permisos para editar la configuración del gremio.';
  end if;
  if p_guild_id is null or p_guild_id <> me.guild_id then
    raise exception 'No podés editar la configuración de otro gremio.';
  end if;

  insert into public.guild_settings (guild_id, albion_guild_name, welcome_message, updated_at)
  values (p_guild_id, nullif(p_albion_guild_name, ''), nullif(p_welcome_message, ''), now())
  on conflict (guild_id) do update
    set albion_guild_name = nullif(excluded.albion_guild_name, ''),
        welcome_message = nullif(excluded.welcome_message, ''),
        updated_at = now();
end;
$$;

-- RPC pública: top de silver del gremio (para el top sin login).
-- SECURITY DEFINER porque wallets tiene RLS (solo el dueño/staff lee su saldo).
create or replace function public.get_silver_top_rpc(p_guild_id text, p_limit int default 50)
returns table (discord_id text, albion_name text, balance bigint, splits bigint)
language sql security definer set search_path = public
as $$
  select w.discord_id,
         u.albion_name,
         w.balance,
         (select count(*) from public.split_participants sp where sp.discord_id = w.discord_id) as splits
  from public.wallets w
  left join public.users u on u.discord_id = w.discord_id
  where w.guild_id = p_guild_id
  order by w.balance desc
  limit p_limit;
$$;

-- RPC pública: consultar el saldo de un jugador por su nombre de Albion (sin login).
create or replace function public.lookup_balance_rpc(p_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_wallet public.wallets%rowtype;
  v_guild text;
  v_rank int;
  v_splits int;
begin
  if p_name is null or length(trim(p_name)) < 2 then
    return jsonb_build_object('found', false);
  end if;
  select * into v_user from public.users
    where lower(albion_name) = lower(trim(p_name)) or lower(display_nick) = lower(trim(p_name))
    limit 1;
  if v_user.discord_id is null then
    return jsonb_build_object('found', false);
  end if;
  select * into v_wallet from public.wallets
    where discord_id = v_user.discord_id and guild_id = v_user.guild_id;
  select albion_guild_name into v_guild from public.guild_settings where guild_id = v_user.guild_id;
  select count(*) into v_rank from public.wallets w
    where w.guild_id = v_user.guild_id and w.balance > coalesce(v_wallet.balance, 0);
  select count(*) into v_splits from public.split_participants sp where sp.discord_id = v_user.discord_id;
  return jsonb_build_object(
    'found', true,
    'discord_id', v_user.discord_id,
    'albion_name', v_user.albion_name,
    'display_nick', v_user.display_nick,
    'guild_name', coalesce(v_guild, 'Cosmopolis'),
    'balance', coalesce(v_wallet.balance, 0),
    'rank', v_rank + 1,
    'splits', v_splits
  );
end;
$$;

-- RPC staff: pago manual del tesorero/administrador (resta del saldo pendiente).
create or replace function public.pay_user_rpc(p_discord_id text, p_amount bigint, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me public.users%rowtype;
  target public.users%rowtype;
  wallet public.wallets%rowtype;
  v_current bigint;
  v_new bigint;
  v_allow_negative boolean;
begin
  select * into me from public.users where auth_user_id = auth.uid();
  if me.discord_id is null then
    raise exception 'No estás registrado en el sistema.';
  end if;
  if not me.is_treasurer then
    raise exception 'Solo tesoreros o administradores pueden pagar.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a 0.';
  end if;
  if length(coalesce(p_reason,'')) < 3 then
    raise exception 'El motivo es obligatorio (mín. 3 caracteres).';
  end if;
  if p_discord_id = me.discord_id then
    raise exception 'No podés pagarte a vos mismo.';
  end if;
  select * into target from public.users where discord_id = p_discord_id and guild_id = me.guild_id;
  if target.discord_id is null then
    raise exception 'El jugador no está registrado en el gremio.';
  end if;
  select * into wallet from public.wallets
    where discord_id = p_discord_id and guild_id = me.guild_id;
  if wallet.discord_id is null then
    insert into public.wallets (discord_id, guild_id, balance) values (p_discord_id, me.guild_id, 0)
    returning * into wallet;
  end if;
  v_current := coalesce(wallet.balance, 0);
  v_new := v_current - p_amount;
  v_allow_negative := v_new < 0;
  update public.wallets set balance = v_new, updated_at = now()
    where discord_id = p_discord_id and guild_id = me.guild_id;
  insert into public.transactions (guild_id, to_discord_id, amount, type, reason, executed_by)
  values (me.guild_id, p_discord_id, -p_amount, 'payment', p_reason, me.discord_id);
  return jsonb_build_object('new_balance', v_new, 'allow_negative', v_allow_negative);
end;
$$;

-- RPC staff: pago de un split COMPLETO (tesorero/admin). Descuenta a cada
-- participante lo que se le acreditó y marca el split como pagado.
create or replace function public.pay_split_complete_rpc(p_split_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me public.users%rowtype;
  s public.splits%rowtype;
  v_total bigint := 0;
  v_parts int := 0;
  v_rec record;
begin
  select * into me from public.users where auth_user_id = auth.uid();
  if me.discord_id is null then
    raise exception 'No estás registrado en el sistema.';
  end if;
  if not me.is_treasurer then
    raise exception 'Solo tesoreros o administradores pueden pagar splits completos.';
  end if;

  select * into s from public.splits where id = p_split_id and guild_id = me.guild_id;
  if s.id is null then
    raise exception 'Split no encontrado en este gremio.';
  end if;
  if s.status not in ('open','locked') then
    raise exception 'Solo se puede pagar un split abierto (open) o cerrado (locked).';
  end if;

  for v_rec in
    select sp.discord_id, sum(sp.amount) as amount
    from public.split_participants sp
    where sp.split_id = p_split_id
    group by sp.discord_id
  loop
    update public.wallets
      set balance = public.wallets.balance - v_rec.amount, updated_at = now()
      where discord_id = v_rec.discord_id and guild_id = me.guild_id;

    insert into public.transactions (guild_id, to_discord_id, amount, type, reference_id, reason, executed_by)
    values (me.guild_id, v_rec.discord_id, -v_rec.amount, 'payment', p_split_id,
            'Split #' || left(p_split_id::text, 6) || ' pagado completo', me.discord_id);

    v_total := v_total + v_rec.amount;
    v_parts := v_parts + 1;
  end loop;

  if v_parts = 0 then
    raise exception 'El split no tiene participantes.';
  end if;

  update public.splits set status = 'paid', paid_at = now() where id = p_split_id;

  return jsonb_build_object('ok', true, 'total', v_total, 'participants', v_parts);
end;
$$;

-- ---------------------------------------------------------------------
-- GRANTs — exponer al Data API
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.guild_settings  enable row level security;
alter table public.fame_tier_roles enable row level security;
alter table public.users           enable row level security;
alter table public.wallets         enable row level security;
alter table public.splits          enable row level security;
alter table public.split_participants enable row level security;
alter table public.split_adjustments enable row level security;
alter table public.transactions    enable row level security;

-- Función de staff (web): true si el auth.uid() pertenece a un usuario con rol de tesorería/splits.
create or replace function public.is_staff_uid() returns boolean
language sql stable security invoker
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and (is_treasurer or is_splits_manager)
  );
$$;

-- true si el auth.uid() corresponde al dueño de un discord_id dado.
create or replace function public.owns_discord_id(target text) returns boolean
language sql stable security invoker
as $$
  select exists (
    select 1 from public.users
    where discord_id = target and auth_user_id = auth.uid()
  );
$$;

-- guild: solo lectura pública para anon/authenticated (necesario para saber dónde se publica).
drop policy if exists "guild_settings_select" on public.guild_settings;
create policy "guild_settings_select" on public.guild_settings
  for select to anon, authenticated using (true);

-- users: cada uno ve/edita su fila; staff ve todo.
drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_staff_uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- wallets: el dueño ve su saldo; staff ve todo.
drop policy if exists "wallets_select" on public.wallets;
create policy "wallets_select" on public.wallets
  for select to authenticated
  using (public.owns_discord_id(discord_id) or public.is_staff_uid());

-- splits: todos los miembros logueados pueden leer los splits del gremio; solo staff escribe.
drop policy if exists "splits_select" on public.splits;
create policy "splits_select" on public.splits
  for select to authenticated
  using (guild_id in (select guild_id from public.users where auth_user_id = auth.uid()) or public.is_staff_uid());

drop policy if exists "splits_insert_staff" on public.splits;
create policy "splits_insert_staff" on public.splits
  for insert to authenticated
  with check (public.is_staff_uid());

drop policy if exists "splits_update_staff" on public.splits;
create policy "splits_update_staff" on public.splits
  for update to authenticated
  using (public.is_staff_uid())
  with check (public.is_staff_uid());

-- split_participants / adjustments / transactions: lectura para miembros del gremio y staff.
drop policy if exists "split_participants_select" on public.split_participants;
create policy "split_participants_select" on public.split_participants
  for select to authenticated
  using (public.owns_discord_id(discord_id) or public.is_staff_uid());

drop policy if exists "split_adjustments_select" on public.split_adjustments;
create policy "split_adjustments_select" on public.split_adjustments
  for select to authenticated
  using (public.owns_discord_id(discord_id) or public.is_staff_uid());

drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select to authenticated
  using (public.owns_discord_id(to_discord_id) or public.is_staff_uid());

-- fame_tier_roles: lectura para todos los logueados (para mostrar tramos en la web).
drop policy if exists "fame_tier_select" on public.fame_tier_roles;
create policy "fame_tier_select" on public.fame_tier_roles
  for select to authenticated using (true);
`;

(async () => {
  const client = new Client({
    connectionString:
      process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Conectado. Aplicando schema...');
  await client.query(SQL);
  console.log('✅ Schema aplicado correctamente.');
  await client.end();
})().catch((e) => {
  console.error('❌ Error aplicando schema:', e.message);
  process.exit(1);
});