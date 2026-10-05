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
    // The landing page is prerendered (possibly during a build without DB access),
    // so an empty or failed snapshot must be refreshed right after hydration.
    revalidateOnMount: unavailable || initial.length === 0,
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
    <section aria-labelledby="live-wins-title" className="mx-auto max-w-6xl px-4 pt-10 sm:px-5 md:pt-14">
      <h2 id="live-wins-title" className="mb-5 font-display text-xl font-extrabold tracking-tight sm:text-2xl">Выигрыши прямо сейчас</h2>
      {items.length === 0 ? (
        <p role="status" className="rounded-3xl bg-card p-6 text-sm leading-relaxed text-muted-foreground shadow-sm">{loadFailed ? 'Не удалось загрузить выигрыши. Попробуйте позже.' : 'Выигрышей пока нет. Здесь появятся результаты сыгранных билетов.'}</p>
      ) : (
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5 [scrollbar-width:none]">
          {items.map((win, index) => (
            <li key={win.id} className={cn('flex w-64 shrink-0 snap-start items-center gap-3 rounded-3xl bg-card p-4 shadow-sm', index === 0 && 'ring-2 ring-primary/40')}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-base font-extrabold text-primary">{win.name[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{win.name} · {win.game}</p>
                <p className="flex items-center gap-1.5 font-display text-lg font-extrabold text-foreground">{win.prize >= 100 && <TrophyMark className="size-4 text-primary" />}{win.prize.toLocaleString('ru-RU')} BYN</p>
                {now !== null && <p className="text-xs text-muted-foreground">{ago(win.at, now)}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
