import type { Metadata } from "next"
import { getBalance } from "@/app/actions/cabinet"
import { PageHeading } from "@/components/account/page-heading"
import { BuyTicketPanel } from "@/components/cabinet/buy-ticket-panel"
import { BackToGames } from "@/components/play/back-to-games"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Моментальная лотерея — bytoloto.com" }

export default async function LotteryPage() {
  await requireSession()
  const balance = await getBalance()

  return (
    <div className="flex flex-col gap-4">
      <BackToGames />
      <PageHeading title="Моментальная лотерея" description="Отметьте числа и купите билет — результат сразу." />
      <BuyTicketPanel balance={balance} />
    </div>
  )
}
