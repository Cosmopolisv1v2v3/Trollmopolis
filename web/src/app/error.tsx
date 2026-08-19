"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { friendlyError } from "@/lib/errors";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error de página:", error);
  }, [error]);

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <div className="panel auth-card status-card">
          <div className="auth-head">
            <div className="auth-ico">
              <Icon name="alert" size={26} />
            </div>
            <p className="status-code">500</p>
            <h1>Ocurrió un error</h1>
            <p className="sub">
              {friendlyError(error.message)} Si el problema continúa, avisá a un
              administrador.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="gold" className="btn-block" onClick={reset}>
              Reintentar
            </Button>
            <Link href="/" className="btn btn-ghost btn-block">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}