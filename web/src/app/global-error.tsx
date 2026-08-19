"use client";

/**
 * Error global: se muestra cuando falla el layout raíz.
 * Debe incluir su propio <html>/<body> porque el layout no se renderiza.
 */
export default function GlobalError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "var(--bg, #10131a)",
          color: "var(--text, #e8e6df)",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            margin: "0 16px",
            padding: "40px 32px",
            borderRadius: 16,
            border: "1px solid rgba(229,72,77,.3)",
            background: "rgba(229,72,77,.07)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 48, lineHeight: 1, fontWeight: 900, margin: "0 0 12px" }}>
            500
          </p>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Ocurrió un error</h1>
          <p style={{ color: "rgba(232,230,223,.7)", margin: "0 0 24px" }}>
            Algo salió mal al cargar la aplicación. Reintentá; si persiste, avisá a un
            administrador.
          </p>
          <button
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 700,
              padding: "12px 20px",
              borderRadius: 10,
              border: "1px solid rgba(232,230,223,.2)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}