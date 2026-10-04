import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LiveWinsFeed } from "@/components/live-wins-feed"

function render(initial: Parameters<typeof LiveWinsFeed>[0]["initial"], unavailable = false) {
  return renderToStaticMarkup(<LiveWinsFeed initial={initial} unavailable={unavailable} />)
}

describe("wins feed without fabricated records", () => {
  it("shows an honest empty state instead of generating winners", () => {
    const html = render([])
    expect(html).toContain("Выигрышей пока нет")
    expect(html).not.toContain("<li")
  })
  it("renders only supplied results, without padding to six records", () => {
    const html = render([{ id: "real-1", name: "Игрок А.", game: "Игра", prize: 10, at: "2026-10-04T00:00:00Z" }])
    expect(html.match(/<li /g)).toHaveLength(1)
    expect(html).toContain("Игрок А.")
  })
  it("distinguishes unavailable data from an empty database", () => {
    const html = render([], true)
    expect(html).toContain("Не удалось загрузить выигрыши")
    expect(html).not.toContain("Выигрышей пока нет")
  })
})
