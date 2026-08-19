import { createClient } from "@/lib/supabase/server";
import { getUserData, getSplits, getGuildPlayers } from "@/lib/data";
import { fmtSilver } from "@/lib/format";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { SplitForm } from "./SplitForm";
import { AdjustSplitForm } from "./AdjustSplitForm";
import { PaySplitButton } from "./PaySplitButton";
import { Panel, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Row } from "./AdjustSplitForm";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; gold?: boolean; cls: string }> = {
  open: { label: "Abierto", cls: "text-[var(--green)]" },
  locked: { label: "Cerrado", gold: true, cls: "text-[var(--gold)]" },
  cancelled: { label: "Cancelado", cls: "text-[var(--red)]" },
};

export default async function SplitsPage() {
  const { profile, user } = await getUserData();
  if (!user) return null;

  if (!profile?.guild_id) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Panel title="Sin gremio asignado" icon="alert">
          <p className="mt-2 text-sm text-[var(--text-2)]">
            No estás vinculado a ningún gremio. Pedile a un oficial que verifique
            tu registro.
          </p>
        </Panel>
      </div>
    );
  }

  const isStaff = Boolean(profile.is_treasurer || profile.is_splits_manager);
  const isTreasurer = Boolean(profile.is_treasurer);
  const guildId = profile.guild_id;

  const [splits, players] = await Promise.all([
    getSplits(guildId),
    isStaff ? getGuildPlayers(guildId) : Promise.resolve([]),
  ]);

  let participantsBySplit: Record<string, Row[]> = {};
  if (isStaff && splits.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("split_participants")
      .select("split_id, user_id, amount_share, adjusted, adjustment_reason")
      .in("split_id", splits.map((s) => s.id))
      .order("amount_share", { ascending: false });
    const users = await supabase
      .from("users")
      .select("discord_id, albion_name")
      .limit(500);
    const nameById = new Map(
      (users.data || []).map((u) => [u.discord_id, u.albion_name as string | null])
    );

    participantsBySplit = (data || []).reduce<Record<string, Row[]>>((acc, p) => {
      (acc[p.split_id] ||= []).push({
        discord_id: p.user_id,
        albion_name: nameById.get(p.user_id) ?? null,
        amount_share: p.amount_share,
        base_amount: p.amount_share,
      });
      return acc;
    }, {});
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Splits de loot</h1>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          {isStaff
            ? "Creá y ajustá repartos. Los cambios impactan en la wallet de cada jugador."
            : "Repartos que te corresponden. Si faltás, avisale al tesorero."}
        </p>
      </div>

      {isStaff && (
        <Panel title="Nuevo split" icon="plus">
          <p className="mb-4 text-xs text-[var(--text-3)]">
            El monto neto se reparte en partes iguales entre los participantes,
            descontando el impuesto de reparación.
          </p>
          <SplitForm players={players} guildId={guildId} />
        </Panel>
      )}

      {splits.length === 0 ? (
        <Panel icon="coins">
          <EmptyState icon="coins">
            <p>No hay splits todavía.</p>
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-4">
          {splits.map((s) => {
            const b = STATUS_BADGE[s.status] || STATUS_BADGE.open;
            return (
              <Panel key={s.id} icon="coins">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`font-semibold ${b.cls}`}>
                      {b.label === "Cerrado" ? (
                        <Badge gold>Cerrado</Badge>
                      ) : (
                        <Badge>{b.label}</Badge>
                      )}
                    </span>
                    <span className="text-lg font-bold text-[var(--text)]">
                      {fmtSilver(s.net_amount)}
                      <span className="ml-1 text-xs font-normal text-[var(--text-3)]">
                        neto
                      </span>
                    </span>
                    <span className="text-sm text-[var(--text-3)]">
                      {fmtSilver(s.total_amount)} total
                    </span>
                    {s.tax_percent > 0 && (
                      <span className="text-xs text-[var(--text-3)]">
                        −{s.tax_percent}% impuesto
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs text-[var(--text-3)]">
                    <div>
                      {fmtDateTime(s.created_at)} · {timeAgo(s.created_at)}
                    </div>
                    {s.loot_location && <div>📍 {s.loot_location}</div>}
                  </div>
                </div>

                {isTreasurer && (s.status === "open" || s.status === "locked") && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <PaySplitButton splitId={s.id} />
                  </div>
                )}

                {isStaff && (
                  <div className="mt-4 border-t border-[var(--border)] pt-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
                      <Icon name="gear" size={13} /> Ajustes de reparto
                    </h3>
                    {participantsBySplit[s.id]?.length ? (
                      <AdjustSplitForm splitId={s.id} rows={participantsBySplit[s.id]} />
                    ) : (
                      <p className="text-xs text-[var(--text-3)]">
                        Sin participantes registrados.
                      </p>
                    )}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}