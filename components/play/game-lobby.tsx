"use client"

import { useMemo, useState } from "react"
import { GameTile, type LobbyGame } from "@/components/play/game-tile"

const SECTIONS: readonly { id: LobbyGame["category"]; title: string }[] = [
  { id: "lottery", title: "Лотереи" },
  { id: "instant", title: "Мгновенные игры" },
]

type Filter = "all" | LobbyGame["category"]

export function GameLobby({ games }: { games: readonly LobbyGame[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const normalized = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      games.filter(
        (game) =>
          (filter === "all" || game.category === filter) &&
          (normalized === "" || `${game.kicker} ${game.title}`.toLowerCase().includes(normalized)),
      ),
    [games, filter, normalized],
  )

  return (
    <section id="catalog" aria-label="Каталог игр" className="flex scroll-mt-24 flex-col gap-6">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Поиск игры</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Игра"
            className="h-12 w-full rounded-xl bg-muted px-4 pr-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-foreground" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </label>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Категория</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            className="h-12 w-full appearance-none truncate rounded-xl bg-muted px-4 pr-10 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">Все категории</option>
            {SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-primary" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
          Ничего не найдено. Попробуйте другое название.
        </p>
      ) : (
        SECTIONS.map((section) => {
          const items = visible.filter((game) => game.category === section.id)
          if (items.length === 0) return null
          return (
            <div key={section.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
                  <span className="size-3 rotate-45 rounded-sm bg-primary" aria-hidden="true" />
                  {section.title}
                </h2>
                <span className="rounded-xl px-3 py-2 text-sm font-bold text-primary ring-2 ring-primary">
                  Все игры ({items.length})
                </span>
              </div>
              <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {items.map((game) => (
                  <li key={game.id} className="w-[42%] shrink-0 snap-start sm:w-auto">
                    <GameTile game={game} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}
    </section>
  )
}
