import type { Metadata } from "next"
import { getBalance } from "@/app/actions/cabinet"
import { getActiveNinjaRound } from "@/app/actions/ninja"
import { NinjaGame } from "@/components/games/ninja/ninja-game"
import { NINJA_GAME_NAME } from "@/lib/games/ninja"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = {
  title: `${NINJA_GAME_NAME} — bytoloto.com`,
  description: "Открывайте свитки кунаем, поднимайте множитель, получайте ранги и закрепляйте выигрыш. Шаринган, Цукуёми и бонус-покупка Пробуждение.",
}

// The game renders its own fullscreen stage above the site chrome.
export default async function NinjaPage() {
  await requireSession()
  const [balance, activeRound] = await Promise.all([getBalance(), getActiveNinjaRound()])
  return <NinjaGame initialBalance={balance} initialRound={activeRound} />
}
