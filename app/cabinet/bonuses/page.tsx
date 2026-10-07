import type { Metadata } from "next"
import { getBonuses } from "@/app/actions/bonuses"
import { BonusCard, type BonusCardInfo } from "@/components/cabinet/bonus-card"
import { claimableTotal, FIRST_DEPOSIT_CAP, RELOAD_CAP, RELOAD_MIN_DEPOSITS, CARD_BONUS, type BonusId } from "@/lib/bonuses"
import { requireSession } from "@/lib/require-session"
import { listActiveBonusOffers } from "@/app/actions/admin-bonuses"
import { BonusOffersList } from "@/components/cabinet/bonus-offers-list"

export const metadata: Metadata = { title: "Бонусы — bytoloto.com" }

const CARDS: Record<BonusId, BonusCardInfo> = {
  welcome: {
    title: "Приветственный бонус",
    tag: "Новичкам",
    description: "Стартовые деньги на баланс сразу после регистрации — попробуйте игры без пополнения.",
    image: "/bonuses/welcome.webp",
  },
  card: {
    title: "Бонус за карту",
    tag: `+${CARD_BONUS} BYN`,
    description: "Привяжите и подтвердите банковскую карту — и получите бонус на игровой баланс.",
    image: "/bonuses/card.webp",
    lockedHref: "/cabinet/cards",
  },
  first_deposit: {
    title: "Первый депозит x2",
    tag: "100%",
    description: `Удваиваем первое пополнение: +100% к сумме, до ${FIRST_DEPOSIT_CAP} BYN.`,
    image: "/bonuses/deposit.webp",
    lockedHref: "/cabinet/deposit",
  },
  reload: {
    title: "Недельный релоад",
    tag: "Каждую неделю",
    description: `10% от пополнений за неделю (от ${RELOAD_MIN_DEPOSITS} BYN), до ${RELOAD_CAP} BYN. Обновляется по понедельникам.`,
    image: "/bonuses/reload.webp",
    lockedHref: "/cabinet/deposit",
  },
}

const ORDER: BonusId[] = ["welcome", "first_deposit", "card", "reload"]

export default async function BonusesPage() {
  await requireSession()
  const overview = await getBonuses()
  const total = claimableTotal(overview)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Подарки</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-foreground">Бонусы</h1>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/30">
            {`Доступно ${total.toLocaleString("ru-RU")} BYN`}
          </span>
        )}
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ORDER.map((id, index) => (
          <li key={id} className="min-w-0">
            <BonusCard id={id} info={CARDS[id]} state={overview[id]} priority={index < 2} />
          </li>
        ))}
      </ul>

      <BonusOffersList offers={await listActiveBonusOffers()} />

      <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
        Бонусы зачисляются на игровой баланс и доступны для игры сразу. Каждый бонус можно получить один раз (релоад — раз в неделю).
      </p>
    </div>
  )
}
