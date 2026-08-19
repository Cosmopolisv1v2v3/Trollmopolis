"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { payUserAction } from "./actions";
import { Button } from "@/components/ui";
import { fmtSilver } from "@/lib/format";

interface Player {
  discord_id: string;
  albion_name: string | null;
  display_nick?: string | null;
}

export function PayForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        setFeedback(null);
        start(async () => {
          const res = await payUserAction(fd);
          if (res.ok) {
            const data = res.data as { new_balance?: number; allow_negative?: boolean } | undefined;
            setFeedback(
              `✅ Pago registrado. Nuevo saldo pendiente: ${fmtSilver(data?.new_balance)}` +
                (data?.allow_negative ? " (queda a favor del gremio)" : "")
            );
            setError(null);
            router.refresh();
          } else {
            setError(res.error);
          }
        });
      }}
      className="space-y-2"
    >
      <div className="field">
        <label htmlFor="pay-user">Jugador (registrado con /registrar)</label>
        <select id="pay-user" name="discord_id" required defaultValue="">
          <option value="" disabled>
            Elegí al jugador…
          </option>
          {players.map((p) => (
            <option key={p.discord_id} value={p.discord_id}>
              {p.display_nick || p.albion_name || p.discord_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pay-amount">Monto (silver)</label>
        <input
          id="pay-amount"
          name="amount"
          type="number"
          min={1}
          required
          placeholder="120000"
        />
      </div>

      <div className="field">
        <label htmlFor="pay-reason">Motivo</label>
        <input
          id="pay-reason"
          name="reason"
          required
          placeholder="Entrega de splits de la semana"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--red-soft)] bg-[var(--red-soft)] px-3 py-2 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      {feedback && (
        <div className="rounded-lg border border-[var(--green-soft)] bg-[var(--green-soft)] px-3 py-2 text-sm text-[var(--green)]">
          {feedback}
        </div>
      )}

      <Button variant="gold" type="submit" icon="bank" disabled={pending}>
        {pending ? "Pagando…" : "Registrar pago"}
      </Button>
    </form>
  );
}