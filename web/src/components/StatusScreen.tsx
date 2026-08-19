"use client";

import Link from "next/link";
import { Icon, type IconName } from "./icons";

/**
 * Pantalla de estado centrada (404, 500, error genérico).
 * Reutiliza los estilos de auth (auth-page / auth-wrap / panel) para
 * quedar bien parada tanto en rutas públicas como dentro del shell.
 */
export function StatusScreen({
  code,
  title,
  message,
  action,
  icon,
}: {
  code?: string;
  title: string;
  message: string;
  action?: { label: string; href: string };
  icon: IconName;
}) {
  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <div className="panel auth-card status-card">
          <div className="auth-head">
            <div className="auth-ico">
              <Icon name={icon} size={26} />
            </div>
            {code && <p className="status-code">{code}</p>}
            <h1>{title}</h1>
            <p className="sub">{message}</p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link href={action?.href ?? "/"} className="btn btn-gold btn-block">
              {action?.label ?? "Volver al inicio"}
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}