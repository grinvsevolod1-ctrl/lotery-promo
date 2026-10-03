import Link from "next/link"
import { DrawCountdown } from "@/components/draw-countdown"
import { CalendarMark } from "@/components/icons"
import { Panel, PanelTitle } from "@/components/cabinet/panel"
import { formatDateTime } from "@/lib/format"

export function NextDrawCard({
  drawId,
  drawAt,
  pendingTickets,
}: {
  drawId: number
  drawAt: Date
  pendingTickets: number
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle
        icon={<CalendarMark className="size-5" />}
        aside={
          <Link href="/results" className="text-xs font-semibold text-gold underline-offset-4 hover:underline">
            Прошлые тиражи
          </Link>
        }
      >
        Тираж №{drawId}
      </PanelTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DrawCountdown drawAt={drawAt.toISOString()} compact className="w-full sm:w-auto" />
        <div className="text-sm text-muted-foreground sm:text-right">
          <p>
            Розыгрыш {formatDateTime(drawAt)} по минскому времени.
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {pendingTickets === 0
              ? "У вас пока нет билетов на этот тираж"
              : `Участвуют ${pendingTickets} ${plural(pendingTickets, ["билет", "билета", "билетов"])}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">Итоги придут на e-mail сразу после розыгрыша.</p>
        </div>
      </div>
    </Panel>
  )
}

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}
