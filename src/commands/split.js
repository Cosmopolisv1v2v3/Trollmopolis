const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  MessageFlags,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { isSplitsManager } = require('../lib/permissions');
const { getOrCreateGuildSettings } = require('../lib/guildSettings');
const { supabase } = require('../lib/supabase');
const { getDraft, saveDraft, clearDraft } = require('../lib/draftStore');
const { fmtSilver } = require('../lib/format');

const P = {
  edit: 'split:edit:',
  amount: 'split:amount:',
  close: 'split:close:',
  pick: 'split:pick:',
  pickPage: 'split:pickpage:',
  pickDone: 'split:pickdone:',
  unreg: 'split:unreg:',
};
const MODAL_EDIT = 'split_edit_modal';
const MODAL_AMOUNT = 'split_amount_modal';
const PICK_PAGE_SIZE = 25;

function sessionPart(customId, prefix) {
  return customId.slice(prefix.length).split(':'); // [guildId, userId]
}

/** Pantalla principal del borrador: participantes + acciones. */
function draftEmbed(draft) {
  const total = draft.participants.length;
  const emb = new EmbedBuilder()
    .setTitle('🛠️ Nuevo split')
    .setColor(0xf1c40f)
    .setDescription(
      `Participantes detectados en voz: **${draft.voiceCount ?? 0}**\n` +
        `Agregados manualmente: **${draft.manualCount ?? 0}**`
    )
    .addFields({
      name: `👥 Participantes (${total})`,
      value:
        total === 0
          ? 'Ninguno todavía. Usá "Editar participantes" para sumarlos.'
          : draft.participants
              .map(
                (p, i) => `${i + 1}. ${p.tag}${p.added_manually ? ' *(manual)*' : ''}`
              )
              .join('\n'),
    })
    .setFooter({ text: 'Podés editar quién entra hasta el último momento.' });
  return emb;
}

function draftButtons(guildId, userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${P.edit}${guildId}:${userId}`)
        .setLabel('✏️ Editar participantes')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${P.amount}${guildId}:${userId}`)
        .setLabel('💰 Definir monto')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${P.close}${guildId}:${userId}`)
        .setLabel('✖️ Cerrar')
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('split')
    .setDescription('Gestioná splits del gremio (reparto de loot).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sc) =>
      sc
        .setName('iniciar')
        .setDescription('Inicia un nuevo split con los que están en un canal de voz.')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal de voz a usar (por defecto: el que estés usando vos)')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(false)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName('ajustar')
        .setDescription('Corrige la parte de un jugador en un split (solo staff).')
        .addStringOption((o) =>
          o
            .setName('split_id')
            .setDescription('ID del split (autocompletado mientras escribís)')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption((o) => o.setName('usuario').setDescription('Jugador afectado').setRequired(true))
        .addIntegerOption((o) => o.setName('monto').setDescription('Monto (positivo o negativo)').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo del ajuste (obligatorio)').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'iniciar') return executeIniciar(interaction);
    if (sub === 'ajustar') return executeAjustar(interaction);
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const query = String(focused).trim().toLowerCase();
    const { searchSplits } = require('../lib/splits');
    const rows = await searchSplits({ guildId: interaction.guildId, prefix: query, limit: 25 });

    const choices = rows.map((s) => {
      const state = s.status === 'paid' ? '✅ pagado' : s.status === 'cancelled' ? '❌ cancelado' : '🔓';
      return {
        name: `#${s.id.slice(0, 6)} · ${fmtSilver(s.total_amount)} · ${state}`.slice(0, 100),
        value: s.id,
      };
    });

    if (choices.length === 0) {
      choices.push({ name: 'Sin splits encontrados para este gremio', value: 'none' });
    }
    return interaction.respond(choices);
  },

  // handlers para el dispatcher de componentes
  buttons: {
    'split:edit:': handleButton,
    'split:amount:': handleButton,
    'split:close:': handleButton,
    'split:pickpage:': handlePickerButton,
    'split:pickdone:': handlePickerButton,
    'split:unreg:': handleUnregButton,
  },
  selects: {
    'split:pick:': handlePickerSelect,
  },
  modals: {
    [MODAL_EDIT]: handleModal,
    [MODAL_AMOUNT]: handleModal,
  },
};

async function executeIniciar(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const settings = await getOrCreateGuildSettings(interaction.guildId);
  if (!isSplitsManager(interaction, settings)) {
    return interaction.editReply('❌ No tenés permisos para crear splits.');
  }

  const voice =
    interaction.options.getChannel('canal') || interaction.member.voice?.channel || null;
  if (!voice) {
    return interaction.editReply(
      '❌ Entrá a un canal de voz o pasá **canal:** con el canal de voz con los participantes, o usá **Editar participantes** para agregarlos manualmente.'
    );
  }

  const channelName = voice.name ? ` (${voice.name})` : '';
  const memberIds = voice.members
    .filter((m) => !m.user.bot)
    .map((m) => m.id);

  // solo registrados pueden figurar como partícipes (para acreditar, necesitamos su fila en users)
  const { data: users } = await supabase
    .from('users')
    .select('discord_id, albion_name')
    .in('discord_id', memberIds);

  const known = new Set((users || []).map((u) => u.discord_id));
  const participants = (users || []).map((u) => ({
    discord_id: u.discord_id,
    tag: interaction.guild.members.cache.get(u.discord_id)?.user.tag || u.albion_name || u.discord_id,
    added_manually: false,
  }));

  const skipped = memberIds.length - known.size;

  const draft = {
    participants,
    voiceCount: memberIds.length,
    manualCount: 0,
  };
  await saveDraft(interaction.guildId, interaction.user.id, draft);

  const emb = draftEmbed(draft);
  emb.setDescription(`Canal usado: **${voice.name}**\n` + emb.data.description);
  if (skipped > 0) {
    emb.setDescription(
      emb.data.description + `\n⚠️ **${skipped}** usuari@s en voz no están registrados y no fueron incluidos (usen \`/registrar\`).`
    );
  }

  return interaction.editReply({ embeds: [emb], components: draftButtons(interaction.guildId, interaction.user.id) });
}

async function executeAjustar(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const settings = await getOrCreateGuildSettings(interaction.guildId);
  if (!isSplitsManager(interaction, settings)) {
    return interaction.editReply('❌ No tenés permisos para ajustar splits.');
  }

  const splitIdMatch = interaction.options
    .getString('split_id')
    .trim()
    .toLowerCase();
  const target = interaction.options.getUser('usuario').id;
  const monto = interaction.options.getInteger('monto');
  const motivo = interaction.options.getString('motivo');

  try {
    const { adjustSplit } = require('../lib/splits');
    // buscar split por prefijo
    const { data: splits } = await supabase
      .from('splits')
      .select('id, guild_id, status, created_at, net_amount')
      .ilike('id', `${splitIdMatch}%`)
      .eq('guild_id', interaction.guildId)
      .order('created_at', { ascending: false })
      .limit(1);
    const split = splits?.[0];
    if (!split) return interaction.editReply('❌ No encontré ese split.');

    await adjustSplit({
      splitId: split.id,
      discordId: target,
      amountDelta: monto,
      reason: motivo,
      adjustedBy: interaction.user.id,
      guildId: interaction.guildId,
    });
    return interaction.editReply(
      `✅ Ajuste aplicado: **${monto > 0 ? '+' : ''}${fmtSilver(monto)}** en split \`${split.id.slice(0, 6)}\` — motivo: *${motivo}*`
    );
  } catch (err) {
    return interaction.editReply(`❌ ${err.message}`);
  }
}

// --- botones del borrador ---
async function handleButton(interaction, customId) {
  if (customId.startsWith(P.close)) {
    const [guildId, userId] = sessionPart(customId, P.close);
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    await clearDraft(guildId, userId);
    return interaction.update({ embeds: [], components: [], content: 'Borrador cerrado.' });
  }

  if (customId.startsWith(P.edit)) {
    const [guildId, userId] = sessionPart(customId, P.edit);
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    const draft = await getDraft(guildId, userId);
    if (!draft) return interaction.update({ embeds: [], components: [], content: 'El borrador expiró. Empezá de nuevo con /split iniciar.' });

    return renderPicker(interaction, guildId, userId, 0);
  }

  if (customId.startsWith(P.amount)) {
    const [guildId, userId] = sessionPart(customId, P.amount);
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    const draft = await getDraft(guildId, userId);
    if (!draft) return interaction.update({ embeds: [], components: [], content: 'El borrador expiró. Empezá de nuevo con /split iniciar.' });

    const modal = new ModalBuilder()
      .setCustomId(`${MODAL_AMOUNT}:${guildId}:${userId}`)
      .setTitle('Configurar split');

    const total = new TextInputBuilder()
      .setCustomId('total')
      .setLabel('Monto total del cofre (silver)')
      .setPlaceholder('Ej: 500000')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const tax = new TextInputBuilder()
      .setCustomId('tax')
      .setLabel('Impuesto reparación (%)')
      .setPlaceholder('Ej: 5 (solo números, sin % )')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const loc = new TextInputBuilder()
      .setCustomId('location')
      .setLabel('Lugar donde se guarda el loot')
      .setPlaceholder('Ej: Lymhurst, Banco piso 4')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(total),
      new ActionRowBuilder().addComponents(tax),
      new ActionRowBuilder().addComponents(loc)
    );
    return interaction.showModal(modal);
  }
}

// --- selector de participantes (lista de usuarios del servidor) ---
function guildMemberList(interaction) {
  const members = interaction.guild?.members.cache;
  if (!members) return [];
  return [...members.values()]
    .filter((m) => !m.user.bot)
    .sort((a, b) => (a.displayName || a.user.username).localeCompare(b.displayName || b.user.username, 'es'));
}

/** Asegura tener todos los miembros del servidor en cache (para guilds grandes). */
async function ensureMembersFetched(interaction) {
  try {
    const guild = interaction.guild;
    if (!guild) return;
    if (guild.members.cache.size < guild.memberCount && guild.memberCount > 100) {
      await guild.members.fetch().catch(() => {});
    }
  } catch {
    /* cache parcial es suficiente */
  }
}

/** Devuelve SOLO los miembros del servidor que ya están registrados en la BD (users). */
async function registeredGuildMemberList(interaction) {
  await ensureMembersFetched(interaction);
  const members = guildMemberList(interaction);
  if (!members.length) return [];
  const { data: users } = await supabase
    .from('users')
    .select('discord_id')
    .in('discord_id', members.map((m) => m.id))
    .eq('guild_id', interaction.guildId);
  const known = new Set((users || []).map((u) => u.discord_id));
  return members.filter((m) => known.has(m.id));
}

function pickerEmbed(guildId, userId, page, pageCount, draft, pageMembers, excludedCount) {
  const currentIds = new Set((draft.participants || []).map((p) => p.discord_id));
  const emb = new EmbedBuilder()
    .setTitle('👥 Elegí los participantes')
    .setColor(0x2ecc71)
    .setDescription(
      `Solo se listan usuarios **registrados** con \`/registrar\`.\n` +
        `Seleccioná en la lista quiénes entran al split.\n` +
        `**${draft.participants?.length || 0}** participante(s) actualmente · Página **${page + 1}/${pageCount}**` +
        (excludedCount > 0 ? `\n\n⚠️ **${excludedCount}** usuario(s) del server no están registrados y no aparecen.` : '')
    )
    .setFooter({ text: 'Podés elegir varios a la vez.' });

  const shown = pageMembers.map(
    (m) =>
      `${currentIds.has(m.id) ? '✅' : '⬜'} **${m.displayName || m.user.username}** — <@${m.id}>`
  );
  emb.addFields({ name: `📋 En esta página (${shown.length})`, value: shown.length ? shown.join('\n') : '_Sin resultados._' });
  return emb;
}

async function renderPicker(interaction, guildId, userId, page) {
  const draft = await getDraft(guildId, userId);
  if (!draft) return interaction.update({ embeds: [], components: [], content: 'El borrador expiró. Empezá de nuevo con /split iniciar.' });

  const allMembers = guildMemberList(interaction);
  const members = await registeredGuildMemberList(interaction);
  if (!members.length) {
    return interaction.update({
      embeds: [],
      components: [],
      content:
        '❌ No hay usuarios registrados en este servidor. Pediles que usen `/registrar` para poder sumarlos a un split.',
    });
  }

  const pageCount = Math.ceil(members.length / PICK_PAGE_SIZE);
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const pageMembers = members.slice(safePage * PICK_PAGE_SIZE, (safePage + 1) * PICK_PAGE_SIZE);

  const currentIds = new Set((draft.participants || []).map((p) => p.discord_id));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${P.pick}${guildId}:${userId}:${safePage}`)
    .setPlaceholder(`Seleccioná participantes… (${pageMembers.length} en esta página)`)
    .setMinValues(0)
    .setMaxValues(pageMembers.length)
    .addOptions(
      pageMembers.map((m) => ({
        label: (m.displayName || m.user.username).slice(0, 100),
        value: m.id,
        default: currentIds.has(m.id),
      }))
    );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${P.pickPage}${guildId}:${userId}:${safePage - 1}`)
      .setLabel('⬅️ Anterior')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId(`${P.pickPage}${guildId}:${userId}:${safePage + 1}`)
      .setLabel('Siguiente ➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= pageCount - 1),
    new ButtonBuilder()
      .setCustomId(`${P.pickDone}${guildId}:${userId}`)
      .setLabel('✅ Listo')
      .setStyle(ButtonStyle.Success)
  );

  return interaction.update({
    embeds: [pickerEmbed(guildId, userId, safePage, pageCount, draft, pageMembers, allMembers.length - members.length)],
    components: [
      new ActionRowBuilder().addComponents(select),
      navRow,
    ],
  });
}

/** Select: actualiza los participantes marcados de la página actual y re-renderiza. */
async function handlePickerSelect(interaction, customId) {
  const [, , guildId, userId, pageStr] = customId.split(':');
  const page = Number(pageStr) || 0;
  if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
  const draft = await getDraft(guildId, userId);
  if (!draft) return interaction.update({ embeds: [], components: [], content: 'El borrador expiró. Empezá de nuevo con /split iniciar.' });

  await ensureMembersFetched(interaction);
  const members = await registeredGuildMemberList(interaction);
  const selected = new Set(interaction.values);

  // conserva apuntados de otras páginas; actualiza los de esta página
  const pageIds = new Set(members.slice(page * PICK_PAGE_SIZE, (page + 1) * PICK_PAGE_SIZE).map((m) => m.id));
  const kept = (draft.participants || []).filter((p) => !pageIds.has(p.discord_id));
  const added = members
    .filter((m) => selected.has(m.id))
    .map((m) => ({
      discord_id: m.id,
      tag: m.displayName || m.user.username,
      added_manually: true,
    }));

  const newDraft = { ...draft, participants: [...kept, ...added] };
  await saveDraft(guildId, userId, newDraft);
  return renderPicker(interaction, guildId, userId, page);
}

/** Botón de paginación o "Listo". */
async function handlePickerButton(interaction, customId) {
  if (customId.startsWith(P.pickDone)) {
    const [, , guildId, userId] = customId.split(':');
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    const draft = await getDraft(guildId, userId);
    if (!draft) return interaction.update({ embeds: [], components: [], content: 'El borrador expiró. Empezá de nuevo con /split iniciar.' });
    const emb = draftEmbed(draft);
    return interaction.update({ embeds: [emb], components: draftButtons(guildId, userId) });
  }

  if (customId.startsWith(P.pickPage)) {
    const [, , guildId, userId, pageStr] = customId.split(':');
    const page = Number(pageStr) || 0;
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    return renderPicker(interaction, guildId, userId, page);
  }
}

// --- modales ---
async function handleModal(interaction, customId) {
  const base = customId.split(':')[0];

  if (base === MODAL_EDIT) {
    const [, guildId, userId] = customId.split(':');
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    const draft = await getDraft(guildId, userId);
    if (!draft) return interaction.reply({ content: 'El borrador expiró.', flags: MessageFlags.Ephemeral });

    const rawParticipants = interaction.fields.getTextInputValue('participants');
    const mentions =
      rawParticipants.match(/<@!?(\d{15,20})>/g) ||
      rawParticipants.match(/\d{15,20}/g) ||
      [];
    const ids = mentions.map((m) => m.match(/\d+/)[0]);

    const users = await loadUsers(interaction, ids);
    // conservar orden dado por el usuario
    const byId = new Map((users || []).map((u) => [u.discord_id, u]));
    const newParts = [];
    for (const id of ids) {
      const u = byId.get(id);
      if (!u) continue;
      newParts.push({
        discord_id: id,
        tag: u.tag || u.albion_name || id,
        added_manually: true,
      });
    }
    const draftsPrev = draft.participants;
    const manualCount = newParts.length;
    const voiceCount = draftsPrev.length - manualCount;

    const newDraft = { participants: newParts, voiceCount: Math.max(0, voiceCount), manualCount };
    await saveDraft(guildId, userId, newDraft);
    return interaction.update({ embeds: [draftEmbed(newDraft)], components: draftButtons(guildId, userId) });
  }

  if (base === MODAL_AMOUNT) {
    const [, guildId, userId] = customId.split(':');
    if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
    const draft = await getDraft(guildId, userId);
    if (!draft) return interaction.reply({ content: 'El borrador expiró.', flags: MessageFlags.Ephemeral });

    const total = Number(interaction.fields.getTextInputValue('total').replace(/[^\d]/g, ''));
    const tax = Number(interaction.fields.getTextInputValue('tax').replace(/[^\d]/g, '')) || 0;
    const location = interaction.fields.getTextInputValue('location').trim() || null;

    if (!Number.isFinite(total) || total <= 0) {
      return interaction.reply({ content: '❌ El monto debe ser un número mayor a 0.', flags: MessageFlags.Ephemeral });
    }
    if (draft.participants.length === 0) {
      return interaction.reply({ content: '❌ No hay participantes en este split. Agregalos primero.', flags: MessageFlags.Ephemeral });
    }

    try {
      // verificar que todos los participantes estén registrados en users
      const allRegistered = await areAllRegistered(guildId, draft.participants);
      if (!allRegistered.ok) {
        // guardar los datos del cófre para el botón que decide seguir sin los no registrados
        await saveDraft(guildId, userId, { ...draft, pending: { total, tax, location } });

        const unregList = allRegistered.unregistered
          .map((p) => `• **${p.tag}** — <@${p.discord_id}>`)
          .join('\n');

        const emb = new EmbedBuilder()
          .setTitle('⚠️ Participantes sin registrar')
          .setColor(0xe67e22)
          .setDescription(
            `Estos usuarios no tienen cuenta vinculada con \`/registrar\`, así que **no pueden recibir plata**:\n\n${unregList}\n\n` +
              `Podés **seguir sin ellos** (se crea el split con los que sí están registrados) o cancelar y registrarlos primero.`
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`${P.unreg}${guildId}:${userId}`)
            .setLabel('✅ Seguir sin estos usuarios')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({ embeds: [emb], components: [row], flags: MessageFlags.Ephemeral });
      }

      await finalizeSplit(interaction, guildId, userId, draft.participants, { total, tax, location });
    } catch (err) {
      console.error(err);
      const msg = `❌ ${err.message}`;
      try {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      } catch (e) {
        if (e.code === 10062) {
          await interaction.user.send({ content: msg }).catch(() => {});
        } else {
          throw e;
        }
      }
    }
  }
}

async function areAllRegistered(guildId, participants) {
  const { data: users } = await supabase
    .from('users')
    .select('discord_id')
    .in('discord_id', participants.map((p) => p.discord_id))
    .eq('guild_id', guildId);
  const known = new Set((users || []).map((u) => u.discord_id));
  const unregistered = participants.filter((p) => !known.has(p.discord_id));
  return unregistered.length ? { ok: false, unregistered } : { ok: true, unregistered: [] };
}

/** Crea el split, publica el embed y loggea. Usado por el modal y el botón de "seguir sin registrados". */
async function finalizeSplit(interaction, guildId, userId, participants, { total, tax, location }) {
  const { createSplit } = require('../lib/splits');
  const result = await createSplit({
    guildId,
    createdBy: userId,
    participants,
    totalAmount: total,
    taxPercent: tax,
    lootLocation: location,
  });

  // embed definitivo al canal de splits
  const channelEmbed = publicSplitEmbed(result, interaction, participants);
  const settings = await getOrCreateGuildSettings(guildId);
  const splitChannel = settings.split_channel_id
    ? interaction.guild?.channels.cache.get(settings.split_channel_id)
    : null;

  // respuesta inmediata al creador
  const confirmEmbed = new EmbedBuilder()
    .setTitle('✅ Split creado')
    .setColor(0x2ecc71)
    .setDescription(
      `Split **#${result.split.id.slice(0, 6)}** — ${fmtSilver(result.split.total_amount)} · neto ${fmtSilver(result.split.net_amount)}\n` +
        `Por cabeza: **${fmtSilver(result.perPerson)}** (${participants.length} participantes)\n` +
        (splitChannel ? `Resumen publicado en ${splitChannel}` : '*(no hay canal de splits configurado)*')
    );
  try {
    await interaction.reply({
      embeds: [confirmEmbed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (e) {
    // la interacción del modal expiró (10062): el split ya existe, avisamos por DM
    if (e.code === 10062) {
      confirmEmbed.setTitle('✅ Split creado (la sesión expiró)');
      await interaction.user.send({ embeds: [confirmEmbed] }).catch(() => {});
    } else {
      throw e;
    }
  }

  if (splitChannel) {
    await splitChannel.send({ embeds: [channelEmbed] });
  }

  // log
  const logChannel = settings.log_channel_id
    ? interaction.guild?.channels.cache.get(settings.log_channel_id)
    : null;
  if (logChannel) {
    await logChannel
      .send({
        embeds: [
          new EmbedBuilder()
            .setTitle('💰 Split creado')
            .setColor(0xf1c40f)
            .setDescription(
              `${interaction.user} creó el split **#${result.split.id.slice(0, 6)}**\n` +
                `Total: **${fmtSilver(result.split.total_amount)}** · Impuesto: ${result.split.tax_percent}% · Neto: ${fmtSilver(result.split.net_amount)}\n` +
                `Loot: ${location || 's/n'} · Participantes: ${participants.length}`
            )
            .setTimestamp(),
        ],
      })
      .catch(() => {});
  }

  await clearDraft(guildId, userId);
}

/** Botón "Seguir sin estos usuarios": descarta los no registrados y crea el split. */
async function handleUnregButton(interaction, customId) {
  const [guildId, userId] = sessionPart(customId, P.unreg);
  if (interaction.user.id !== userId) return interaction.reply({ content: 'Este menú no es tuyo.', flags: MessageFlags.Ephemeral });
  const draft = await getDraft(guildId, userId);
  if (!draft || !draft.pending) {
    return interaction.update({ embeds: [], components: [], content: 'El borrador expiró. Empezá de nuevo con /split iniciar.' });
  }

  try {
    const check = await areAllRegistered(guildId, draft.participants);
    const kept = check.unregistered.length
      ? draft.participants.filter((p) => !check.unregistered.includes(p))
      : draft.participants;

    if (!kept.length) {
      return interaction.update({ embeds: [], components: [], content: '❌ Ningún participante quedó registrado. El split no se creó.' });
    }

    await finalizeSplit(interaction, guildId, userId, kept, draft.pending);
  } catch (err) {
    console.error(err);
    return interaction.update({ embeds: [], components: [], content: `❌ ${err.message}` });
  }
}

function publicSplitEmbed(result, interaction, participants) {
  return new EmbedBuilder()
    .setTitle(`💰 Split #${result.split.id.slice(0, 6)}`)
    .setColor(0xf1c40f)
    .setDescription(
      `**Total:** ${fmtSilver(result.split.total_amount)} · **Impuesto:** ${result.split.tax_percent}%\n` +
        `**Neto repartible:** ${fmtSilver(result.split.net_amount)} · **Loot:** ${result.split.loot_location || 's/n'}\n` +
        `<t:${Math.floor(new Date().getTime() / 1000)}:F>`
    )
    .addFields({
      name: `🧾 Participantes (${participants.length})`,
      value: participants
        .map((p, i) => `**${i + 1}.** ${p.tag} — \`${fmtSilver(result.perPerson)}\``)
        .join('\n'),
    })
    .setFooter({ text: `Creado por ${interaction.user.tag} · se cierra en 10 min a menos que se edite` });
}

async function loadUsers(interaction, ids) {
  const { data: users } = await supabase
    .from('users')
    .select('discord_id, albion_name')
    .in('discord_id', ids);
  const result = [];
  for (const u of users || []) {
    const member = interaction.guild?.members.cache.get(u.discord_id);
    result.push({
      discord_id: u.discord_id,
      albion_name: u.albion_name,
      tag: member ? `${member.user.username} (${u.albion_name || 'sin registro'})` : `${u.albion_name || u.discord_id}`,
    });
  }
  return result;
}