import Link from "next/link";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth-page">
      <header className="auth-top">
        <Link href="/" className="auth-brand">
          <span className="brand-icon" style={{ width: 30, height: 30, fontSize: 16 }}>
            🏰
          </span>
          Cosmopolis
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="auth-link" href="/">
            Volver al inicio
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="auth-wrap">
        <div className="panel auth-card">
          <div className="auth-head">
            <div className="auth-ico">🏰</div>
            <h1>Bienvenido de vuelta</h1>
            <p className="sub">
              Entrá con tu cuenta de Discord. Te identifica con el mismo ID que usa
              el bot del server: roles, splits y saldo viajan directo.
            </p>
          </div>

          {error && (
            <Alert kind="error">{decodeURIComponent(error)}</Alert>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <DiscordSignInButton />
            <p className="hint text-center" style={{ margin: 0 }}>
              ¿Todavía no estás en el server? Registrate en Discord con{" "}
              <code>/registrar</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}