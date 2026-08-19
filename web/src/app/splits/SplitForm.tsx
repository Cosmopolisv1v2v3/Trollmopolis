"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSplitAction, getVoiceChannelsAction, type VoiceChannelInfo } from "./actions";
import { Alert, Button } from "@/components/ui";

interface Player {
  discord_id: string;
  albion_name: string | null;
  fame_tier: string | null;
}

export function SplitForm({
  players,
  guildId,
}: {
  players: Player[];
  guildId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const [channels, setChannels] = useState<VoiceChannelInfo[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("");

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function loadVoice() {
    setError(null);
    setVoiceMsg(null);
    start(async () => {
      const res = await getVoiceChannelsAction(guildId);
      if (!res.ok) {
        setChannels([]);
        setActiveChannel("");
        setVoiceMsg(res.error);
        return;
      }
      setChannels(res.channels);
      if (res.channels.length === 0) {
        setVoiceMsg("No hay canales de voz con miembros en el servidor.");
      }
    });
  }

  function applyVoiceChannel(channelId: string) {
    setActiveChannel(channelId);
    const ch = channels.find((c) => c.id === channelId);
    if (!ch) return;
    const ids = new Set(ch.members.map((m) => m.discord_id));
    const registered = players.filter((p) => ids.has(p.discord_id));
    const known = new Set(players.map((p) => p.discord_id));
    const unregistered = ch.members.filter((m) => !known.has(m.discord_id)).length;

    if (registered.length === 0) {
      setVoiceMsg(
        `En ${ch.name} hay ${ch.members.length} persona(s) pero ninguno está registrado con /registrar.`
      );
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      registered.forEach((p) => next.add(p.discord_id));
      return [...next];
    });
    setVoiceMsg(
      `Se agregaron ${registered.length} participante(s) de ${ch.name}` +
        (unregistered > 0 ? `. ${unregistered} sin registrar no se incluyeron.` : "")
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("participants", selected.join(","));
        start(async () => {
          const res = await createSplitAction(fd);
          if (res.ok) {
            setSelected([]);
            setError(null);
            setVoiceMsg(null);
            router.refresh();
          } else {
            setError(res.error);
          }
        });
      }}
      className="form-grid-inline"
    >
      <div className="field">
        <label htmlFor="split-total">Monto total (silver)</label>
        <input
          id="split-total"
          name="total"
          type="number"
          min={1}
          required
          placeholder="500000"
        />
      </div>
      <div className="field">
        <label htmlFor="split-tax">Impuesto reparación (%)</label>
        <input
          id="split-tax"
          name="tax"
          type="number"
          min={0}
          max={100}
          defaultValue={0}
        />
      </div>
      <div className="field">
        <label htmlFor="split-location">Lugar del loot</label>
        <input
          id="split-location"
          name="location"
          placeholder="Lymhurst, banco piso 4"
        />
      </div>

      <div className="field">
        <label>Participantes ({selected.length})</label>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button type="button" icon="users" size="sm" onClick={loadVoice} disabled={pending}>
            Detectar en voz
          </Button>
          {channels.length > 0 && (
            <select
              className="max-w-xs flex-1"
              value={activeChannel}
              onChange={(e) => applyVoiceChannel(e.target.value)}
            >
              <option value="" disabled>
                Canal de voz con «{selected.length}» marcados…
              </option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  🔊 {ch.name} ({ch.members.length})
                </option>
              ))}
            </select>
          )}
        </div>
        {voiceMsg && (
          <p className="mb-2 text-xs text-[var(--text-3)]">{voiceMsg}</p>
        )}
        <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {players.length === 0 && (
            <p className="col-span-full text-sm text-[var(--text-3)]">
              Todavía no hay jugadores registrados. Primero que se registren en
              Discord.
            </p>
          )}
          {players.map((p) => {
            const active = selected.includes(p.discord_id);
            return (
              <button
                key={p.discord_id}
                type="button"
                onClick={() => toggle(p.discord_id)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-(--gold) bg-(--gold-soft) text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--bg-4)] text-[var(--text-3)] hover:border-[var(--text-3)]"
                }`}
              >
                <span>{p.albion_name || p.discord_id.slice(0, 8)}</span>
                {active && <span className="text-[var(--gold)]">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert kind="error">{error}</Alert>
      )}

      <Button
        variant="gold"
        type="submit"
        disabled={pending || selected.length === 0}
        icon="save"
      >
        {pending ? "Creando…" : "Crear split"}
      </Button>
    </form>
  );
}