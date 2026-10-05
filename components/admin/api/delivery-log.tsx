import type { DeliveryResult } from "@/lib/card-webhook"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso))
}

export function DeliveryLog({ entries }: { entries: DeliveryResult[] }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Журнал вебхуков</h2>
      <p className="mt-1 text-sm text-muted-foreground">Последние 30 отправок на внешний сервис.</p>
      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">Отправок ещё не было.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border/60">
          {entries.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className={`size-2 shrink-0 rounded-full ${entry.ok ? "bg-emerald-500" : "bg-destructive"}`} aria-hidden="true" />
              <span className="sr-only">{entry.ok ? "Доставлено" : "Ошибка"}</span>
              <span className="font-mono text-foreground">{entry.event}</span>
              {entry.requestNo && <span className="font-mono text-muted-foreground">{entry.requestNo}</span>}
              <span className={entry.ok ? "text-emerald-500" : "text-destructive"}>{entry.ok ? `HTTP ${entry.status}` : entry.error}</span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatDate(entry.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
