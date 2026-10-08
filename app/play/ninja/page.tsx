import type { Metadata } from "next"
import { getBalance } from "@/app/actions/cabinet"
import { getActiveNinjaRound } from "@/app/actions/ninja"
import { PageHeading } from "@/components/account/page-heading"
import { NinjaGame } from "@/components/games/ninja/ninja-game"
import { BackToGames } from "@/components/play/back-to-games"
import { NINJA_GAME_NAME } from "@/lib/games/ninja"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = {
  title: `${NINJA_GAME_NAME} — bytoloto.com`,
  description: "Открывайте свитки кунаем, поднимайте множитель, получайте ранги и закрепляйте выигрыш. Шаринган, Цукуёми и бонус-покупка Пробуждение.",
}

export default async function NinjaPage() {
  await requireSession()
  const [balance, activeRound] = await Promise.all([getBalance(), getActiveNinjaRound()])

  return (
    <div className="flex flex-col gap-4">
      <BackToGames />
      <PageHeading
        title={NINJA_GAME_NAME}
        description="Свитки, кунаи и ловушки Акацуки. Чем дальше по пути — тем выше множитель; ранги страхуют от провала."
      />
      <NinjaGame initialBalance={balance} initialRound={activeRound} />
    </div>
  )
}
