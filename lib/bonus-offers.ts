import { CATALOG_LIVE, CATALOG_SLOTS } from "@/lib/games/catalog"

export const OFFER_KINDS = {
  deposit_match: "Бонус на депозит",
  reload: "Релоад",
  free_spins: "Фриспины",
  no_deposit: "Без депозита",
  cashback: "Кешбэк",
  insurance: "Страховка ставки",
} as const

export const OFFER_CATEGORIES = { slots: "Слоты", live: "Live-игры", all: "Все игры" } as const

export const OFFER_AUDIENCES = {
  all: "Все игроки",
  new: "Новые (первое пополнение)",
  returning: "Постоянные",
  verified: "Только верифицированные",
} as const

export type OfferKind = keyof typeof OFFER_KINDS
export type OfferCategory = keyof typeof OFFER_CATEGORIES
export type OfferAudience = keyof typeof OFFER_AUDIENCES

export type BonusOfferRow = {
  id: number
  title: string
  description: string
  kind: OfferKind
  category: OfferCategory
  gameTitle: string | null
  percent: number | null
  amount: number | null
  maxBonus: number | null
  minDeposit: number | null
  freeSpins: number | null
  spinValue: number | null
  wager: number
  wagerContribution: number
  validDays: number
  maxWin: number | null
  audience: OfferAudience
  promoCode: string | null
  active: boolean
  sortOrder: number
}

export const GAME_TITLES = {
  slots: CATALOG_SLOTS.map((game) => game.title),
  live: CATALOG_LIVE.map((game) => game.title),
}

const byn = (value: number) => `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} BYN`

function dayWord(days: number) {
  const mod10 = days % 10
  const mod100 = days % 100
  if (mod10 === 1 && mod100 !== 11) return "день"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня"
  return "дней"
}

/** Short headline value shown on the card, e.g. "100% до 150 BYN" or "50 FS". */
export function offerHeadline(offer: BonusOfferRow) {
  if (offer.kind === "free_spins" || (offer.kind === "no_deposit" && offer.freeSpins)) return `${offer.freeSpins ?? 0} FS`
  if (offer.kind === "cashback") return `${offer.percent ?? 0}% кешбэк`
  if (offer.percent) return `${offer.percent}%${offer.maxBonus ? ` до ${byn(offer.maxBonus)}` : ""}`
  if (offer.amount) return `+${byn(offer.amount)}`
  return OFFER_KINDS[offer.kind]
}

/** Human-readable list of every condition of the offer. */
export function offerConditions(offer: BonusOfferRow): string[] {
  const lines: string[] = []
  lines.push(offer.gameTitle ? `Игра: ${offer.gameTitle}` : `Игры: ${OFFER_CATEGORIES[offer.category].toLowerCase()}`)
  if (offer.freeSpins) lines.push(`${offer.freeSpins} вращений по ${byn(offer.spinValue ?? 0)}`)
  if (offer.kind === "cashback") lines.push(`Возврат ${offer.percent ?? 0}% чистого проигрыша${offer.maxBonus ? `, до ${byn(offer.maxBonus)}` : ""}`)
  else if (offer.kind === "insurance") lines.push(`Возврат проигранной первой ставки до ${byn(offer.maxBonus ?? 0)}`)
  else if (offer.percent) lines.push(`+${offer.percent}% к пополнению${offer.maxBonus ? `, максимум ${byn(offer.maxBonus)}` : ""}`)
  else if (offer.amount) lines.push(`Бонус ${byn(offer.amount)}`)
  lines.push(offer.minDeposit ? `Минимальное пополнение: ${byn(offer.minDeposit)}` : "Пополнение не требуется")
  lines.push(offer.wager > 0 ? `Отыгрыш: x${offer.wager}` : "Без отыгрыша")
  if (offer.wagerContribution < 100) lines.push(`Ставки засчитываются в отыгрыш на ${offer.wagerContribution}%`)
  if (offer.maxWin) lines.push(`Максимальный выигрыш: ${byn(offer.maxWin)}`)
  lines.push(`Срок действия: ${offer.validDays} ${dayWord(offer.validDays)}`)
  lines.push(`Для кого: ${OFFER_AUDIENCES[offer.audience].toLowerCase()}`)
  return lines
}
