"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { paySplitCompleteAction } from "./actions";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

export function PaySplitButton({ splitId }: { splitId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  function confirmAndPay() {
    if (!armed) {
      setArmed(true);
      setError(null);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    const fd = new FormData();
    fd.set("split_id", splitId);
    start(async () => {
      const res = await paySplitCompleteAction(fd);
      if (res.ok) {
        setArmed(false);
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
        setArmed(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={armed ? "danger" : "gold"}
        size="sm"
        icon="bank"
        onClick={confirmAndPay}
        disabled={pending}
      >
        {pending ? "Pagando…" : armed ? "¿Confirmar pago?" : "Pagar completo"}
      </Button>
      {error && <span className="text-xs text-[var(--red)]">{error}</span>}
      {armed && (
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-3)]">
          <Icon name="alert" size={13} />
          Esta acción descuenta a todos los participantes
        </span>
      )}
    </div>
  );
}