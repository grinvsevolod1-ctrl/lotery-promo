import type { FundingRequestRow } from "@/app/actions/funding"
import { Panel } from "@/components/cabinet/panel"

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает подтверждения", awaiting_payment: "Ожидает оплаты", approved: "Завершено", rejected: "Отклонено",
}

export function FundingPanel({ requests }: { requests: FundingRequestRow[] }) {
  return (
    <Panel className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="font-display text-lg font-extrabold text-foreground">Пополнение и вывод</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">Автоматическое пополнение и вывод на сайте пока недоступны. Операции обрабатываются администратором вручную через Telegram-бота.</p>
      {requests.length === 0 ? <p className="text-sm text-muted-foreground">Операций пока нет.</p> : (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
              <span>{request.type === "deposit" ? "Пополнение" : "Вывод"} {request.amount.toLocaleString("ru-RU")} BYN</span>
              <span className="text-muted-foreground">{STATUS_LABEL[request.status] ?? request.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
