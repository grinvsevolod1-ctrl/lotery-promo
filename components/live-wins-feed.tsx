'use client'

import { useEffect, useState } from 'react'
import { TrophyMark } from '@/components/icons'
import { GAMES, minWinningMatches, prizeFor } from '@/lib/lottery'
import { cn } from '@/lib/utils'

export type FeedItem = { id: string; name: string; game: string; prize: number; at: string; demo?: boolean }

const NAMES = ['Алексей', 'Марина', 'Дмитрий', 'Ольга', 'Сергей', 'Анна', 'Игорь', 'Наталья', 'Павел', 'Екатерина', 'Артём', 'Юлия', 'Виктор', 'Ирина', 'Максим', 'Татьяна']
const INITIALS = 'АБВГДЕЗИКЛМНОПРСТФХЧШЯ'
const VISIBLE = 6

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function demoWin(seq: number): FeedItem {
  const game = pick(GAMES)
  const min = minWinningMatches(game)
  // Small prizes are far more common than big ones, like in the real tables.
  const roll = Math.random()
  const matches = Math.min(game.pick, min + (roll > 0.97 ? 3 : roll > 0.85 ? 2 : roll > 0.55 ? 1 : 0))
  return {
    id: `demo-${seq}-${Date.now()}`,
    name: `${pick(NAMES)} ${pick(INITIALS.split(''))}.`,
    game: game.name,
    prize: prizeFor(game, matches) || prizeFor(game, min),
    at: new Date().toISOString(),
    demo: true,
  }
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 10) return 'только что'
  if (s < 60) return `${s} сек назад`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} мин назад`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} ч назад` : `${Math.round(h / 24)} дн назад`
}

export function LiveWinsFeed({ initial }: { initial: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[]>(initial.slice(0, VISIBLE))
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    let seq = 0
    setNow(Date.now())
    setItems((prev) => {
      const filled = [...prev]
      while (filled.length < VISIBLE) filled.push({ ...demoWin(seq++), at: new Date(Date.now() - filled.length * 47_000).toISOString() })
      return filled
    })
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setItems((prev) => [demoWin(seq++), ...prev].slice(0, VISIBLE))
      setNow(Date.now())
      timer = setTimeout(tick, 2500 + Math.random() * 3500)
    }
    timer = setTimeout(tick, 2000)
    const clock = setInterval(() => setNow(Date.now()), 10_000)
    return () => {
      clearTimeout(timer)
      clearInterval(clock)
    }
  }, [])

  return (
    <section aria-labelledby="live-wins-title" className="relative py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="live-wins-title" className="flex items-center gap-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="relative flex size-3" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
            Выигрыши сейчас
          </h2>
          <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground">Демо-лента</span>
        </div>

        <ul aria-live="off" className="flex flex-col gap-2 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-2 backdrop-blur-xl">
          {items.map((w, i) => (
            <li
              key={w.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 sm:px-4',
                i === 0 ? 'animate-feed-in bg-gold/10' : 'bg-foreground/5',
              )}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/20 font-display text-sm font-extrabold text-foreground">
                {w.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {w.game} · {now === null ? '' : ago(w.at, now)}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 font-display text-base font-extrabold text-gold sm:text-lg">
                {w.prize >= 100 && <TrophyMark className="size-4" />}+{w.prize.toLocaleString('ru-RU')} BYN
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
