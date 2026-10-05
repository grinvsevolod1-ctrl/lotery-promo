import { EmptyState } from "@/components/cabinet/panel"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type Transaction = {
  id: number
  type: string
  amount: number
  description: string
  createdAt: Date
}

const TYPE_LABEL: Record<string, string> = {
  welcome: "Бонус",
  purchase: "Покупка",
  prize: "Выигрыш",
  spin: "Колесо",
  withdrawal_hold: "Вывод",
  withdrawal_refund: "Возврат",
}

export function TransactionsList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return <EmptyState text="Операций пока нет." />

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="grain relative flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur-xl"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{tx.description}</p>
            <p className="text-xs text-muted-foreground/70">
              <span className="mr-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider">
                {TYPE_LABEL[tx.type] ?? tx.type}
              </span>
              {formatDateTime(tx.createdAt)}
            </p>
          </div>
          <span className={cn("shrink-0 font-display text-lg font-extrabold", tx.amount >= 0 ? "text-gold" : "text-muted-foreground")}>
            {tx.amount >= 0 ? "+" : ""}
            {tx.amount}
          </span>
        </li>
      ))}
    </ul>
  )
}
