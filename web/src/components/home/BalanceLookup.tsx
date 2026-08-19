"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { fmtSilver } from "@/lib/format";
import { Avatar } from "@/components/ui";

interface LookupResult {
  found: boolean;
  discord_id?: string;
  albion_name?: string | null;
  display_nick?: string | null;
  guild_name?: string | null;
  balance?: number;
  rank?: number;
  splits?: number;
}

export function BalanceLookup() {
  const [name, setName] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = name.trim();
    if (!q || q.length < 2) {
      setError("Escribí el nombre de tu personaje (mín. 2 caracteres).");
      return;
    }
    setError(null);
    setLoading(true);
    setQuery(q);
    setResult(null);
    try {
      const res = await fetch(`/api/lookup?name=${encodeURIComponent(q)}`);
      const data = (await res.json()) as LookupResult;
      setResult(data);
    } catch {
      setResult(null);
      setError("No se pudo consultar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="home-section">
      <div className="panel lookup-panel mx-auto w-full max-w-2xl">
        <div className="lookup-head">
          <span className="feat-ico">
            <Icon name="coins" size={22} />
          </span>
          <div>
            <h3 className="text-xl font-black tracking-tight text-[var(--text)]">
              Consultá tu saldo
            </h3>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              Buscá por nombre de personaje de Albion o nick del servidor.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lookup-form">
          <div className="field lookup-field">
            <label htmlFor="balance-name" className="sr-only">
              Nombre del personaje
            </label>
            <Icon name="search" size={18} className="lookup-field-ico" />
            <input
              id="balance-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: CosmNico"
              autoComplete="off"
              minLength={2}
              maxLength={32}
            />
            {loading && (
              <span className="lookup-field-spin" aria-hidden="true">
                <Icon name="refresh" size={16} />
              </span>
            )}
          </div>
          <button type="submit" className="btn btn-gold" disabled={loading}>
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </form>

        {error && (
          <div className="mt-4">
            <div className="alert alert-err" role="alert">
              <span className="alert-ico">
                <Icon name="alert" size={17} />
              </span>
              <span className="alert-body">{error}</span>
            </div>
          </div>
        )}

        {result && !loading && !error && (
          <div className="mt-5">
            {!result.found ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-4)] px-5 py-6 text-center">
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[var(--gold-soft)] text-[var(--gold)]">
                  <Icon name="search" size={20} />
                </span>
                <p className="font-bold text-[var(--text)]">
                  No encontramos &ldquo;{query}&rdquo;
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-2)]">
                  Si estás registrado en Discord con <code>/registrar</code>, tu nombre
                  figura acá. Asegurate de escribir el nombre tal cual figura en Albion.
                </p>
              </div>
            ) : (
              <div className="lookup-result">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <Avatar
                      name={result.display_nick || result.albion_name || "?"}
                      size={48}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-[var(--text)]">
                        {result.display_nick || result.albion_name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-3)]">
                        {result.albion_name}
                        {result.guild_name ? ` · ${result.guild_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">
                      Saldo por cobrar
                    </p>
                    <p className="mt-0.5 text-2xl font-black tabular-nums text-gold">
                      {fmtSilver(result.balance)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
                  <div className="rounded-lg bg-[var(--bg-4)] px-3.5 py-3">
                    <p className="text-xs text-[var(--text-3)]">Posición en el Top</p>
                    <p className="mt-0.5 text-lg font-bold text-[var(--text)]">
                      #{result.rank}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-4)] px-3.5 py-3">
                    <p className="text-xs text-[var(--text-3)]">Splits</p>
                    <p className="mt-0.5 text-lg font-bold text-[var(--text)]">
                      {result.splits}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}