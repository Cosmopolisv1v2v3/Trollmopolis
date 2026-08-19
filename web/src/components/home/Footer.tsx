import Link from "next/link";

export function Footer() {
  return (
    <footer className="home-footer bg-[var(--bg-2)] w-full border-t border-[var(--border)] py-8 px-8 mt-12">
      <div className="flex justify-between w-full gap-8 flex-wrap">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-bold text-[var(--text)] flex items-center gap-2">
            🏰 Cosmopolis
          </span>
          <p className="text-sm text-[var(--text-2)] text-center md:text-left">
            Tesorería del gremio Cosmopolis para Albion Online.
          </p>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center justify-center gap-2 rounded-4xl h-6 w-30 bg-[var(--gold-soft)] border border-[var(--border)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[var(--gold)]">Bot en línea</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--text-2)]">
            <Link href="/" className="hover:text-[var(--gold)] transition-colors">
              Inicio
            </Link>
            <Link href="/login" className="hover:text-[var(--gold)] transition-colors">
              Entrar
            </Link>
          </div>
          <div>
            © {new Date().getFullYear()} Cosmopolis. No está afiliado con Sandbox Interactive.
          </div>
        </div>
      </div>
    </footer>
  );
}