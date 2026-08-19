import type { Metadata } from "next";
import { Cinzel_Decorative, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/components/ui";
import { AppShell } from "@/components/AppShell";
import { CursorGlow } from "@/components/CursorGlow";
import { CoinRain } from "@/components/home/CoinRain";

/* Cinzel Decorative (títulos) + Manrope (cuerpo) */
const cinzel = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cosmopolis — Gremio Albion Online",
  description:
    "Registro, splits y banco del gremio Cosmopolis. Sincronizado con el bot de Discord.",
};

/* Script que aplica el tema guardado antes de la hidratación (evita parpadeo) */
const themeScript = `(function(){try{var t=localStorage.getItem('cosmopolis:theme');if(t==='light'||t==='dark'||t==='night')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${cinzel.variable} ${manrope.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <CoinRain />
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
          <CursorGlow />
        </ThemeProvider>
      </body>
    </html>
  );
}