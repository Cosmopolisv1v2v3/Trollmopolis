"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustSplitAction } from "./actions";
import { fmtSilver } from "@/lib/format";
import { Alert, Button } from "@/components/ui";

export interface Row {
  discord_id: string;
  albion_name: string | null;
  amount_share: number | null;
  base_amount: number | null;
}

export function AdjustSplitForm({ splitId, rows }: { splitId: string; rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <form
          key={r.discord_id}
          action={(fd) => {
            fd.set("split_id", splitId);
            fd.set("user_id", r.discord_id);
            start(async () => {
              const res = await adjustSplitAction(fd);
              if (res.ok) {
                setError(null);
                router.refresh();
              } else {
                setError(res.error);
              }
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="w-36 truncate text-sm text-[var(--text-2)]">
            {r.albion_name || r.discord_id.slice(0, 8)}
          </span>
          <span className="text-xs text-[var(--text-3)]">
            {fmtSilver(r.base_amount)}
          </span>
          <input
            name="amount"
            type="number"
            step="1"
            placeholder="± monto"
            className="w-28 !px-2 !py-1 text-sm"
          />
          <input
            name="reason"
            type="text"
            required
            placeholder="motivo del ajuste"
            className="w-44 !px-2 !py-1 text-sm"
          />
          <Button type="submit" variant="ghost" size="sm" icon="up" disabled={pending}>
            {pending ? "…" : "Ajustar"}
          </Button>
        </form>
      ))}
      {error && (
        <Alert kind="error">{error}</Alert>
      )}
    </div>
  );
}