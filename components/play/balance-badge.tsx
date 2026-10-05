export function BalanceBadge({ balance }: { balance: number }) {
  return (
    <div className="shrink-0 rounded-2xl bg-card px-4 py-2.5 text-right ring-1 ring-border">
      <p className="text-[11px] font-medium text-muted-foreground">Баланс</p>
      <p className="font-display text-lg font-extrabold tabular-nums text-foreground">
        {balance.toLocaleString("ru-RU")} <span className="text-sm text-primary">BYN</span>
      </p>
    </div>
  )
}
