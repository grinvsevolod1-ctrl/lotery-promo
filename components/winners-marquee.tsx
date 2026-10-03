import { TrophyMark } from '@/components/icons'
import { getSettledDraws } from '@/lib/draws'
import { formatDateShort } from '@/lib/format'
import { DRAW_HOUR_MINSK, MAX_NUMBER, NUMBERS_PER_TICKET, WELCOME_BONUS, parseNumbers } from '@/lib/lottery'

type Item = { title: string; detail: string; highlight: string }

const facts: Item[] = [
  { title: 'Тираж каждый день', detail: `в ${DRAW_HOUR_MINSK}:00 по Минску`, highlight: 'бесплатно' },
  { title: 'Приветственный бонус', detail: 'после подтверждения e-mail', highlight: `+${WELCOME_BONUS} BYN` },
  { title: 'Формат игры', detail: `${NUMBERS_PER_TICKET} чисел из ${MAX_NUMBER}`, highlight: 'честный ГСЧ' },
  { title: 'Результаты', detail: 'публикуются открыто', highlight: '/results' },
]

async function loadItems(): Promise<Item[]> {
  try {
    const draws = await getSettledDraws(8)
    const items = draws
      .filter((d) => d.winningNumbers)
      .map((d) => ({
        title: `Тираж №${d.id} · ${formatDateShort(d.drawAt)}`,
        detail: parseNumbers(d.winningNumbers ?? '').join(' '),
        highlight: d.winnersCount > 0 ? `${d.winnersCount} побед. · ${d.prizeTotal} BYN` : 'без победителей',
      }))
    return items.length > 0 ? items : facts
  } catch {
    // The marquee must never break the landing page if the database is unavailable.
    return facts
  }
}

/** Ticker with the latest real draw results (or the promotion facts before the first draw). */
export async function WinnersMarquee() {
  const items = await loadItems()
  const loop = [...items, ...items]
  return (
    <div
      className="relative overflow-hidden border-y border-gold/25 bg-[oklch(0.22_0.1_300)] py-3"
      aria-label="Последние результаты тиражей"
    >
      <div className="flex w-max animate-marquee gap-10 pr-10">
        {loop.map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2.5 text-sm" aria-hidden={i >= items.length}>
            <TrophyMark className="size-4 text-gold" />
            <span className="font-bold text-foreground">{item.title}</span>
            <span className="text-muted-foreground tabular-nums">{item.detail}</span>
            <span className="font-heading font-extrabold text-gold">{item.highlight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
