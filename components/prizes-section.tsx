import Image from 'next/image'
import Link from 'next/link'
import { GAMES, topPrize } from '@/lib/lottery'
import { cn } from '@/lib/utils'

const TILE_STYLES: Record<string, { bg: string; button: string }> = {
  keno: { bg: 'from-[#c04de0] via-[#7a2ad0] to-[#3d1690]', button: 'text-[#5b1fb0]' },
  five: { bg: 'from-[#ff7a1a] via-[#e8410e] to-[#a8200a]', button: 'text-[#c2330c]' },
  super: { bg: 'from-[#2fc1a8] via-[#0e7a72] to-[#08403f]', button: 'text-[#0b5f59]' },
}

export function PrizesSection() {
  return (
    <section id="games" aria-labelledby="games-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-5 md:pt-14">
      <h2 id="games-title" className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
        Моментальные лотереи
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Результат сразу после покупки билета</p>

      <ul className="mt-5 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((game) => {
          const style = TILE_STYLES[game.id] ?? TILE_STYLES.keno
          return (
            <li key={game.id}>
              <article
                className={cn(
                  'relative flex aspect-[4/5] flex-col overflow-hidden rounded-3xl bg-gradient-to-b p-4 text-white shadow-lg shadow-black/10 transition-transform hover:-translate-y-1',
                  style.bg,
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[30%] size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl"
                />
                <div className="relative flex items-center justify-between text-[11px] font-semibold text-white/80">
                  <span>
                    {game.pick} из {game.max}
                  </span>
                  <span>{game.tagline}</span>
                </div>
                <div className="relative -mx-2 my-2 min-h-0 flex-1">
                  <Image
                    src={`/games/${game.id}.png`}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 480px) 45vw, 90vw"
                    className="object-contain [mask-image:radial-gradient(closest-side,black_72%,transparent)]"
                  />
                </div>
                <h3 className="relative text-center font-display text-2xl font-black uppercase tracking-tight">{game.name}</h3>
                <p className="relative mt-3 text-center text-xs font-semibold text-white/85">Джекпот</p>
                <p className="relative text-center font-display text-2xl font-black tracking-tight">
                  {topPrize(game).toLocaleString('ru-RU')} BYN
                </p>
                <Link
                  href="/sign-up"
                  className={cn(
                    'relative mt-4 flex h-11 items-center justify-center rounded-full bg-white text-xs font-extrabold uppercase tracking-wide transition-transform hover:scale-[1.03]',
                    style.button,
                  )}
                >
                  Играть {game.cost} BYN
                </Link>
              </article>
            </li>
          )
        })}
        <li>
          <article className="flex aspect-[4/5] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-[#3f6df0] to-[#1a3aa8] p-4 text-white shadow-lg shadow-black/10">
            <div className="text-center">
              <p className="font-display text-base font-extrabold leading-snug">Уже купили билет?</p>
              <p className="mt-1 text-xs leading-relaxed text-white/80">Все билеты и выигрыши хранятся в личном кабинете</p>
            </div>
            <div className="relative -mx-2 my-2 min-h-0 flex-1">
              <Image
                src="/games/check.png"
                alt=""
                fill
                sizes="(min-width: 1024px) 260px, (min-width: 480px) 45vw, 90vw"
                className="object-contain [mask-image:radial-gradient(closest-side,black_72%,transparent)]"
              />
            </div>
            <Link
              href="/results"
              className="flex h-11 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold uppercase tracking-wide text-accent transition-transform hover:scale-[1.03]"
            >
              Проверить билет
            </Link>
          </article>
        </li>
      </ul>
    </section>
  )
}
