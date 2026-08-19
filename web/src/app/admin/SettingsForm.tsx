"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGuildSettingsAction } from "./actions";
import { Button } from "@/components/ui";

export function SettingsForm({
  guildId,
  defaultName,
  defaultWelcome,
}: {
  guildId: string;
  defaultName: string | null;
  defaultWelcome: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) => {
        fd.set("guild_id", guildId);
        start(async () => {
          const res = await updateGuildSettingsAction(fd);
          if (res.ok) {
            setError(null);
            router.refresh();
          } else {
            setError(res.error);
          }
        });
      }}
      className="form-grid-inline"
    >
      <div className="field">
        <label htmlFor="guild-name">Nombre del gremio en Albion</label>
        <input
          id="guild-name"
          name="albion_guild_name"
          defaultValue={defaultName ?? ""}
          placeholder="Cosmopolis"
        />
      </div>

      <div className="field">
        <label htmlFor="guild-welcome">Mensaje de bienvenida (ATR Script)</label>
        <textarea
          id="guild-welcome"
          name="welcome_message"
          defaultValue={defaultWelcome ?? ""}
          rows={4}
          placeholder="Bienvenido a Cosmopolis…"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--red-soft)] bg-[var(--red-soft)] px-3 py-2 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      <Button variant="gold" type="submit" icon="save" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}