import { getPublicSettings, getSilverTop } from "@/lib/data";
import { fmtSilver } from "@/lib/format";
import { Avatar, EmptyState } from "@/components/ui";
import { MEDALS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PODIUM_ORDER = [1, 0, 2]; // visual: 2º | 1º | 3º
const PODIUM_HEIGHT = ["h-44", "h-56", "h-36"];

export default async function TopPage() {
  const settings = await getPublicSettings();
  const top = settings?.guild_id
    ? await getSilverTop(settings.guild_id, 10)
    : [];

  const podium = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Top de Silver · {settings?.albion_guild_name || "Cosmopolis"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Ranking público del gremio por plata acumulada por cobrar.
        </p>
      </div>

      {top.length === 0 ? (
        <div className="panel rounded-xl bg-(--bg-2)">
          <EmptyState small icon="trophy">
            <p>
              Aún no hay datos. Cuando los splits llenen las wallets del gremio,
              el ranking aparecerá aquí.
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="podium-wrap">
              <div className="podium-grid">
                {PODIUM_ORDER.map((i) => {
                  const p = podium[i];
                  if (!p) return null;
                  return (
                    <div key={p.discord_id} className="podium-slot">
                      <p className="podium-name">
                        <span className="mr-1">{MEDALS[i]}</span>
                        <span className="truncate">{p.albion_name || p.discord_id.slice(0, 8)}</span>
                      </p>
                      <div className="podium-card podium-first flex items-center justify-center">
                        <div>
                          <div className="mx-auto mb-1 flex w-fit">
                            <Avatar name={p.albion_name || p.discord_id} size={i === 0 ? 48 : 40} />
                          </div>
                          <p className="podium-amount tabular-nums">{fmtSilver(p.balance)}</p>
                          <p className="podium-splits">{p.splits} splits</p>
                        </div>
                      </div>
                      <div className={`podium-base ${PODIUM_HEIGHT[i]}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="panel panel-tight rounded-xl bg-(--bg-2)">
            <div className="panel-head">
              <h2>Siguientes en el ranking</h2>
              <span className="badge">Hasta el top 10</span>
            </div>
            <div className="flex flex-col">
              {rest.map((t, i) => {
                const rank = i + 4;
                const gridStyle =
                  "grid grid-cols-[3rem_minmax(0,1fr)_4rem_7rem] items-center gap-3";
                return (
                  <div
                    key={t.discord_id}
                    className={`${gridStyle} h-12 px-3 py-2 rounded-xl transition-colors m-1 hover:bg-[var(--hover)]`}
                  >
                    <span className="text-center font-extrabold text-[var(--text-3)] tabular-nums">
                      {rank}
                    </span>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={t.albion_name || t.discord_id} size={30} />
                      <span className="truncate font-semibold text-[var(--text)]">
                        {t.albion_name || t.discord_id.slice(0, 8)}
                      </span>
                    </span>
                    <span className="text-right tabular-nums text-[var(--text-2)]">
                      {t.splits}
                    </span>
                    <span className="text-right font-bold tabular-nums text-[var(--text)] text-sm">
                      {fmtSilver(t.balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}