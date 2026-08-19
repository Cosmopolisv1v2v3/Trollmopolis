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
      <div className="panel panel-tight lookup-panel mx-auto max-w-xl">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="feat-ico">
            <Icon name="search" size={20} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">Consultá tu saldo</h3>
            <p className="text-sm text-[var(--text-3)]">
              Buscá por nombre de personaje de Albion o nick del servidor.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid-inline" style={{ gridTemplateColumns: "1fr auto" }}>
          <div className="field">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: CosmNico"
              className="w-full"
              minLength={2}
            />
          </div>
          <button type="submit" className="btn btn-gold" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Icon name="refresh" size={15} /> Buscando…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="search" size={15} /> Buscar
              </span>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-3 rounded-lg border border-[var(--red-soft)] bg-[var(--red-soft)] px-3 py-2 text-sm text-[var(--red)]">
            {error}
          </div>
        )}

        {result && !loading && !error && (
          <div className="mt-4">
            {!result.found ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-4)] px-4 py-4 text-center text-sm text-[var(--text-2)]">
                No encontramos <b>{query}</b> en el banco del gremio. Si estás
                registrado en Discord con <code>/registrar</code>, tu nombre figura acá.
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-4)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={result.display_nick || result.albion_name || "?"} size={42} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--text)]">
                        {result.display_nick || result.albion_name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-3)]">
                        {result.albion_name} · {result.guild_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Saldo por cobrar</p>
                    <p className="text-xl font-extrabold tabular-nums text-gold">
                      {fmtSilver(result.balance)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-3)]">Posición en el Top</p>
                    <p className="font-bold text-[var(--text)]">#{result.rank}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-3)]">Splits</p>
                    <p className="font-bold text-[var(--text)]">{result.splits}</p>
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