import {
  adminLogout,
  approveFundingRequest,
  confirmCard,
  rejectCard,
  rejectFundingRequest,
  type PendingCardRow,
  type PendingFundingRow,
} from "@/app/actions/admin"

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)
}

export function AdminDashboard({ cards, requests }: { cards: PendingCardRow[]; requests: PendingFundingRow[] }) {
  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Админ-панель</h1>
          <p className="text-sm text-muted-foreground">Ручное подтверждение карт и заявок</p>
        </div>
        <form action={adminLogout}>
          <button type="submit" className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5">
            Выйти
          </button>
        </form>
      </header>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Карты на подтверждение {cards.length > 0 && <span className="text-gold">({cards.length})</span>}
        </h2>
        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">Нет заявок.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cards.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {c.brand} •••• {c.last4} {c.bankName && <span className="text-muted-foreground">· {c.bankName}</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.cardholder} — {c.userName} ({c.userEmail})
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={confirmCard.bind(null, c.id)}>
                    <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      Подтвердить
                    </button>
                  </form>
                  <form action={rejectCard.bind(null, c.id)}>
                    <button type="submit" className="rounded-full border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive">
                      Отклонить
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Заявки на пополнение/вывод {requests.length > 0 && <span className="text-gold">({requests.length})</span>}
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">Нет заявок.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {r.type === "deposit" ? "Пополнение" : "Вывод"} · {r.amount} BYN
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.userName} ({r.userEmail}) — карта •••• {r.cardLast4 ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approveFundingRequest.bind(null, r.id)}>
                    <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      Одобрить
                    </button>
                  </form>
                  <form action={rejectFundingRequest.bind(null, r.id)}>
                    <button type="submit" className="rounded-full border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive">
                      Отклонить
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
