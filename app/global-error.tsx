"use client"

// Rendered only when the root layout itself fails, so it must ship its own
// <html>/<body> and cannot rely on the global stylesheet.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: "#1b0f33",
          color: "#f7f3fb",
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: 420 }}>
          <p style={{ color: "#e0b64a", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            bytoloto.com
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "12px 0 8px" }}>Сайт временно недоступен</h1>
          <p style={{ color: "#c9bfe0", lineHeight: 1.5 }}>
            Произошла критическая ошибка. Мы уже знаем о проблеме — попробуйте обновить страницу через минуту.
          </p>
          {error.digest && <p style={{ color: "#8f82ad", fontSize: 12, fontFamily: "monospace" }}>Код: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 28px",
              borderRadius: 999,
              border: 0,
              background: "#d8268f",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Обновить
          </button>
        </main>
      </body>
    </html>
  )
}
