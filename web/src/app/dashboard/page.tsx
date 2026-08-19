import Link from "next/link";
import { getUserData, getTransactions } from "@/lib/data";
import { fmtSilver, fmtFame } from "@/lib/format";
import { fmtDateTime } from "@/lib/format";
import { Panel, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const TX_COLOR: Record<string, string> = {
  split: "text-gold",
  payment: "text-sky-400",
  adjustment: "text-zinc-300",
  manual: "text-zinc-400",
};
const TX_LABEL: Record<string, string> = {
  split: "Split",
  payment: "Pago",
  adjustment: "Ajuste",
  manual: "Manual",
};

export default async function DashboardPage() {
  const { user, profile, wallet, settings } = await getUserData();

  if (!user) return null;

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Panel title="Aún no estás registrado" icon="user">
          <p className="mt-3 text-[var(--text-2)]">
            Este panel se vincula a tu personaje de Albion. Abrí Discord y ejecutá{" "}
            <code>/registrar</code> con el nombre exacto de tu personaje. Después
            volvé acá.
          </p>
          <p className="mt-4 text-sm text-[var(--text-3)]">
            Correo de tu sesión: {user.email || user.id.slice(0, 8)}
          </p>
        </Panel>
      </div>
    );
  }

  const tx = await getTransactions(profile.discord_id, 15);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Hola, {profile.display_nick || profile.albion_name || "jugador"} 👋
          </h1>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Personaje: <b className="text-[var(--text-2)]">{profile.albion_name}</b> ·{" "}
            {settings?.albion_guild_name || "Cosmopolis"}
          </p>
        </div>
        <div className="flex gap-2">
          <SignOutButton />
          <Link className="btn btn-gold btn-sm" href="/splits">
            Ver splits
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-ico g">
            <Icon name="bank" size={19} />
          </div>
          <div className="stat-value">{fmtSilver(wallet?.balance ?? 0)}</div>
          <div className="stat-label">Saldo por cobrar (silver)</div>
        </div>
        <div className="stat-card">
          <div className="stat-ico gr">
            <Icon name="skull" size={19} />
          </div>
          <div className="stat-value">{fmtFame(profile.kill_fame)}</div>
          <div className="stat-label">Fama de caza</div>
        </div>
        <div className="stat-card">
          <div className="stat-ico b">
            <Icon name="user" size={19} />
          </div>
          <div className="stat-value">
            {profile.ip_average ? Math.round(profile.ip_average) : "—"}
          </div>
          <div className="stat-label">IP promedio</div>
        </div>
      </div>

      <Panel
        title="Movimientos recientes"
        icon="history"
        actions={<Badge>Tus últimos movimientos</Badge>}
      >
        {tx.length === 0 ? (
          <EmptyState icon="history">
            <p>
              Todavía no tenés movimientos. Participá de un split para empezar.
            </p>
          </EmptyState>
        ) : (
          <table className="table-stack w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--text-3)]">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Monto</th>
                <th className="py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)]/60 last:border-0">
                  <td className="py-2.5 pr-4 text-[var(--text-3)]" data-label="Fecha">
                    {fmtDateTime(t.created_at)}
                  </td>
                  <td className="py-2.5 pr-4" data-label="Tipo">
                    <span className={`font-medium ${TX_COLOR[t.type]}`}>
                      {TX_LABEL[t.type]}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 pr-4 font-semibold ${
                      t.amount >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                    }`}
                    data-label="Monto"
                  >
                    {t.amount >= 0 ? "+" : "−"}
                    {fmtSilver(Math.abs(t.amount))}
                  </td>
                  <td className="py-2.5 text-[var(--text-3)]" data-label="Detalle">
                    {t.reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}