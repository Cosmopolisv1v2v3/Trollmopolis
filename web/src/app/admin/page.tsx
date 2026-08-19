import { getUserData, getFameTiers, getGuildPlayers } from "@/lib/data";
import { fmtSilver } from "@/lib/format";
import { SettingsForm } from "./SettingsForm";
import { PayForm } from "./PayForm";
import { Panel, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, profile, settings } = await getUserData();
  if (!user) return null;

  if (!profile?.is_treasurer && !profile?.is_splits_manager) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Panel title="Acceso restringido" icon="alert">
          <p className="mt-2 text-sm text-[var(--text-2)]">
            Esta vista es solo para tesoreros y managers de splits.
          </p>
        </Panel>
      </div>
    );
  }

  const tiers = await getFameTiers(profile.guild_id);
  const isTreasurer = Boolean(profile.is_treasurer);
  const players =
    isTreasurer && profile.guild_id ? await getGuildPlayers(profile.guild_id) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Administración</h1>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Configuración del gremio, pagos y sistema de splits.
        </p>
      </div>

      {isTreasurer && (
        <Panel
          title="Pagar a un jugador"
          icon="bank"
          actions={<span className="badge">Solo tesorería</span>}
        >
          <p className="mb-4 text-xs text-[var(--text-3)]">
            Registra una entrega de silver a un jugador: se descuenta de su saldo
            pendiente por cobrar y queda en el historial.
          </p>
          {players.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">
              No hay jugadores registrados todavía.
            </p>
          ) : (
            <PayForm players={players} />
          )}
        </Panel>
      )}

      <Panel title="Configuración del gremio" icon="gear">
        <SettingsForm
          guildId={profile.guild_id as string}
          defaultName={settings?.albion_guild_name ?? null}
          defaultWelcome={settings?.welcome_message ?? null}
        />
      </Panel>

      <Panel title="Escalafón por fama" icon="crown">
        {tiers.length === 0 ? (
          <EmptyState icon="crown">
            <p className="text-sm text-[var(--text-2)]">
              No hay tramos configurados. Se crean con el comando adecuado del bot.
            </p>
          </EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--text-3)]">
                <th className="py-2 pr-4">Tramo</th>
                <th className="py-2 pr-4">Fama mínima</th>
                <th className="py-2 pr-4">Fama máxima</th>
                <th className="py-2">Color</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)]/60 last:border-0">
                  <td className="py-2.5 pr-4 text-[var(--text)]">{t.name}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-3)]">{fmtSilver(t.min_fame)}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-3)]">
                    {t.max_fame ? fmtSilver(t.max_fame) : "∞"}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: t.role_color || "#888" }}
                    />
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