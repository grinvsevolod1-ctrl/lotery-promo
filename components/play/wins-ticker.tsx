"use client"

import useSWR from "swr"
import type { FeedItem } from "@/components/live-wins-feed"

const fetchWins = async (url: string): Promise<FeedItem[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("wins unavailable")
  return res.json()
}

function maskName(name: string) {
  return name.length <= 2 ? name : `${name.slice(0, 2)}***`
}

export function WinsTicker() {
  const { data } = useSWR("/api/wins", fetchWins, { refreshInterval: 10_000, keepPreviousData: true })
  if (!data || data.length === 0) return null

  const row = data.map((w) => (
    <li key={w.id} className="flex shrink-0 items-center gap-2 px-4 text-sm">
      <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-[11px] font-extrabold text-primary">
        {w.name[0]}
      </span>
      <span className="text-muted-foreground">{maskName(w.name)}</span>
      <span className="text-muted-foreground">{w.game}</span>
      <span className="font-extrabold tabular-nums text-primary">+{w.prize.toLocaleString("ru-RU")} BYN</span>
    </li>
  ))

  return (
    <section aria-label="Последние выигрыши" className="relative overflow-hidden rounded-2xl bg-card py-2.5 ring-1 ring-border">
      <span className="absolute inset-y-0 left-0 z-10 flex items-center gap-1.5 bg-card pl-3 pr-2 text-[11px] font-extrabold uppercase tracking-wider text-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        Live
      </span>
      <div className="flex w-max animate-[ticker_40s_linear_infinite] pl-16 hover:[animation-play-state:paused] motion-reduce:animate-none">
        <ul className="flex">{row}</ul>
        <ul className="flex" aria-hidden="true">{row}</ul>
      </div>
    </section>
  )
}
