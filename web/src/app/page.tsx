import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, getUserData } from "@/lib/data";
import { fmtSilver } from "@/lib/format";
import { HomeNav } from "@/components/home/HomeNav";
import { Footer } from "@/components/home/Footer";
import { BalanceLookup } from "@/components/home/BalanceLookup";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const data = await getUserData();

  return (
    <div className="home-page">
      <HomeNav />

      <section className="pt-2 home-hero hero-wrap self-center">
        <div className="home-hero-inner">
          <div>
            <div className="hero-badge">🏰 Tesorería del gremio Cosmopolis · Albion Online</div>
            <h1>
              Tu plata de los splits
              <span className="gold-grad-text hero-line-2">siempre en orden</span>
            </h1>
            <p className="hero-sub">
              El bot de Discord registra cada split, y acá seguís tu saldo por cobrar,
              el historial de movimientos y el Top de Silver del gremio. Todo
              sincronizado con el mismo Discord ID que usás en el server.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-gold" href="/login">
                Iniciar sesión con Discord
                <Icon name="arrow" size={17} />
              </Link>
              <a
                className="btn btn-ghost"
                href="https://discord.com/invite/your-invite"
                rel="noopener noreferrer"
              >
                Entrar al Discord
              </a>
            </div>
            <div className="trust-line">
              <span className="tl-ico">
                <Icon name="shield" size={14} />
              </span>
              Verificado contra tu cuenta de Discord en el server
            </div>
          </div>

          <div className="perspective-container">
            <div className="tilt-card report-card">
              <div className="report-head">
                <div>
                  <h3>Tu saldo por cobrar</h3>
                  <p className="rh-sub">Banco del gremio · actualizado en vivo</p>
                </div>
                <span className="report-badge">Splits</span>
              </div>
              <div className="report-stats">
                <div className="report-stat">
                  <p className="rs-label">Plata pendiente</p>
                  <p className="rs-value">—</p>
                </div>
                <div className="report-stat rs-alt">
                  <p className="rs-label">Movimientos</p>
                  <p className="rs-value">—</p>
                </div>
              </div>
              <div className="report-contrib">
                <p className="report-contrib-title">¿Qué incluye?</p>
                <div className="rc-row">
                  <span className="rc-left">
                    <span className="rc-ico">
                      <Icon name="coins" size={15} />
                    </span>
                    Reparto de loot
                  </span>
                  <span className="rc-val">split</span>
                </div>
                <div className="rc-row">
                  <span className="rc-left">
                    <span className="rc-ico">
                      <Icon name="bank" size={15} />
                    </span>
                    Pago del tesorero
                  </span>
                  <span className="rc-val">/pagar</span>
                </div>
                <div className="rc-row">
                  <span className="rc-left">
                    <span className="rc-ico">
                      <Icon name="trophy" size={15} />
                    </span>
                    Top de Silver
                  </span>
                  <span className="rc-val">ranking</span>
                </div>
              </div>
              <div className="report-cofre">
                <div className="cf-head">
                  <span>Mismo Discord ID</span>
                  <b>bot · web</b>
                </div>
                <div className="cf-track">
                  <div className="cf-fill" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BalanceLookup />

      <section className="home-stats">
        <div className="stat-card">
          <div className="stat-ico g">
            <Icon name="coins" size={19} />
          </div>
          <div className="stat-value">{data.profile ? fmtSilver(data.wallet?.balance) : "—"}</div>
          <div className="stat-label">Plata por cobrar</div>
        </div>
        <div className="stat-card">
          <div className="stat-ico gr">
            <Icon name="shield" size={19} />
          </div>
          <div className="stat-value">{data.settings?.albion_guild_name || "Cosmopolis"}</div>
          <div className="stat-label">Gremio Albion</div>
        </div>
        <div className="stat-card">
          <div className="stat-ico g">
            <Icon name="scroll" size={19} />
          </div>
          <div className="stat-value">{data.profile?.fame_tier || "—"}</div>
          <div className="stat-label">Tu tramo</div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-grid">
          <div className="panel feat-card">
            <div className="feat-ico">
              <Icon name="coin" size={22} />
            </div>
            <h3>Registro</h3>
            <p>
              Vinculá tu personaje con <code>/registrar</code> en Discord y obtené tus
              roles al instante.
            </p>
          </div>
          <div className="panel feat-card">
            <div className="feat-ico">
              <Icon name="coins" size={22} />
            </div>
            <h3>Splits</h3>
            <p>
              El tesorero reparte el loot con impuesto por reparar; vos ves los montos
              y llevás el control de lo que te corresponde.
            </p>
          </div>
          <div className="panel feat-card">
            <div className="feat-ico">
              <Icon name="trophy" size={22} />
            </div>
            <h3>Top de Silver</h3>
            <p>
              Ranking del gremio por plata acumulada por cobrar, actualizado con cada
              split nuevo.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}