'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { TrophyMark } from '@/components/icons'
import { cn } from '@/lib/utils'

export type FeedItem = { id: string; name: string; game: string; prize: number; at: string }

function ago(iso: string, now: number) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 10) return 'только что'
  if (seconds < 60) return `${seconds} сек назад`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} ч назад` : `${Math.round(hours / 24)} дн назад`
}

const fetchWins = async (url: string): Promise<FeedItem[]> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('wins unavailable')
  return res.json()
}

export function LiveWinsFeed({ initial, unavailable = false }: { initial: FeedItem[]; unavailable?: boolean }) {
  const [now, setNow] = useState<number | null>(null)
  const { data, error } = useSWR('/api/wins', fetchWins, {
    fallbackData: initial,
    refreshInterval: 10_000,
    revalidateOnMount: false,
    keepPreviousData: true,
  })
  const items = (data ?? initial).slice(0, 6)
  const loadFailed = Boolean(error) || (unavailable && data === initial)

  useEffect(() => {
    setNow(Date.now())
    const clock = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(clock)
  }, [])

  return (
    <section aria-labelledby="live-wins-title" className="relative py-12 md:py-16">
      <div className="mx-auto max-w-3xl px-5">
        <h2 id="live-wins-title" className="mb-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Последние выигрыши</h2>
        {items.length === 0 ? (
          <p role="status" className="rounded-3xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">{loadFailed ? 'Не удалось загрузить выигрыши. Попробуйте позже.' : 'Выигрышей пока нет. Здесь появятся результаты сыгранных билетов.'}</p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-2 backdrop-blur-xl">
            {items.map((win, index) => (
              <li key={win.id} className={cn('flex items-center gap-3 rounded-2xl px-3 py-3 sm:px-4', index === 0 ? 'bg-gold/10' : 'bg-foreground/5')}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/20 font-display text-sm font-extrabold text-foreground">{win.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{win.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{win.game}{now !== null && ` · ${ago(win.at, now)}`}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 font-display text-base font-extrabold text-gold sm:text-lg">{win.prize >= 100 && <TrophyMark className="size-4" />}+{win.prize.toLocaleString('ru-RU')} BYN</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
