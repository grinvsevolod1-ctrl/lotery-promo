import type { Metadata } from "next"
import { getBalance } from "@/app/actions/cabinet"
import { PageHeading } from "@/components/account/page-heading"
import { ScratchGame } from "@/components/games/scratch/scratch-game"
import { BackToGames } from "@/components/play/back-to-games"
import { SCRATCH_GAME_NAME } from "@/lib/games/scratch"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: `${SCRATCH_GAME_NAME} — bytoloto.com` }

export default async function ScratchPage() {
  await requireSession()
  const balance = await getBalance()

  return (
    <div className="flex flex-col gap-4">
      <BackToGames />
      <PageHeading title={SCRATCH_GAME_NAME} description="Сотрите шесть полей — чем больше одинаковых символов, тем больше выигрыш." />
      <ScratchGame initialBalance={balance} />
    </div>
  )
}
