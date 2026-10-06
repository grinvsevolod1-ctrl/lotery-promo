import type { Metadata } from "next"
import { getSpinStatus } from "@/app/actions/cabinet"
import { PageHeading } from "@/components/account/page-heading"
import { DailySpin } from "@/components/cabinet/daily-spin"
import { BackToGames } from "@/components/play/back-to-games"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Колесо удачи — bytoloto.com" }

export default async function WheelPage() {
  await requireSession()
  const spinStatus = await getSpinStatus()

  return (
    <div className="flex flex-col gap-4">
      <BackToGames />
      <PageHeading title="Колесо удачи" description="Один бесплатный прокрут каждый день." />
      <DailySpin spunToday={spinStatus.spunToday} todaySegment={spinStatus.todaySegment} todayAmount={spinStatus.todayAmount} />
    </div>
  )
}
