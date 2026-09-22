import { TrophyMark } from '@/components/icons'

const winners = [
  { name: 'Александр М.', city: 'Минск', amount: '250 000 BYN' },
  { name: 'Елена К.', city: 'Гомель', amount: '48 500 BYN' },
  { name: 'Дмитрий П.', city: 'Брест', amount: '1 200 000 BYN' },
  { name: 'Ольга С.', city: 'Витебск', amount: '32 000 BYN' },
  { name: 'Игорь В.', city: 'Гродно', amount: '96 750 BYN' },
  { name: 'Наталья Ф.', city: 'Могилёв', amount: '410 000 BYN' },
  { name: 'Сергей Л.', city: 'Минск', amount: '75 300 BYN' },
]

export function WinnersMarquee() {
  const items = [...winners, ...winners]
  return (
    <div className="relative overflow-hidden border-y border-gold/25 bg-[oklch(0.22_0.1_300)] py-3">
      <div className="flex w-max animate-marquee gap-10 pr-10">
        {items.map((w, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2.5 text-sm">
            <TrophyMark className="size-4 text-gold" />
            <span className="font-bold text-foreground">{w.name}</span>
            <span className="text-muted-foreground">{w.city}</span>
            <span className="font-heading font-extrabold text-gold">+{w.amount}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
