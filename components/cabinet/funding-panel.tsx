import type { FundingRequestRow } from "@/app/actions/funding"
import type { PaymentCardView } from "@/app/actions/cards"
import { Panel } from "@/components/cabinet/panel"
import { WithdrawForm } from "@/components/cabinet/withdraw-form"

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает подтверждения", awaiting_payment: "Ожидает оплаты", approved: "Завершено", rejected: "Отклонено, деньги возвращены",
}

export function FundingPanel({ requests, cards, balance }: { requests: FundingRequestRow[]; cards: PaymentCardView[]; balance: number }) {
  const confirmed = cards
    .filter((c) => c.status === "confirmed")
    .map((c) => ({ id: c.id, last4: c.last4, bankName: c.bankName, isDefault: c.isDefault }))
  const hasPending = requests.some((r) => r.type === "withdrawal" && r.status === "pending")

  return (
    <Panel className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="font-display text-lg font-extrabold text-foreground">Вывод выигрыша</h2>
      <WithdrawForm cards={confirmed} balance={balance} hasPending={hasPending} />
      {requests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
              <span>{request.type === "deposit" ? "Пополнение" : "Вывод"} {request.amount.toLocaleString("ru-RU")} BYN</span>
              <span className="text-muted-foreground">
                {request.type === "deposit" && request.status === "rejected" ? "Отклонено" : STATUS_LABEL[request.status] ?? request.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
