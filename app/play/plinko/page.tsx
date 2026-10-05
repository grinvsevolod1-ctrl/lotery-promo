import type { Metadata } from "next"
import { getBalance } from "@/app/actions/cabinet"
import { PageHeading } from "@/components/account/page-heading"
import { PlinkoGame } from "@/components/games/plinko/plinko-game"
import { BackToGames } from "@/components/play/back-to-games"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Plinko — bytoloto.com" }

export default async function PlinkoPage() {
  await requireSession()
  const balance = await getBalance()

  return (
    <div className="flex flex-col gap-4">
      <BackToGames />
      <PageHeading title="Plinko" description="Шарик падает сквозь пины — множитель лунки умножает ставку." />
      <PlinkoGame initialBalance={balance} />
    </div>
  )
}
