import {
  adminLogout,
  approveFundingRequest,
  confirmCard,
  rejectCard,
  rejectFundingRequest,
  requestDepositCodeAgain,
  type PendingCardRow,
  type PendingFundingRow,
} from "@/app/actions/admin"

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)
}

export function AdminDashboard({ cards, requests }: { cards: PendingCardRow[]; requests: PendingFundingRow[] }) {
  return (
    <>
      <datalist id="reject-reasons">
        <option value="Не выполнен отыгрыш бонуса" />
        <option value="Неверные реквизиты карты или кошелька" />
        <option value="Карта не принадлежит владельцу аккаунта" />
        <option value="Требуется верификация личности" />
        <option value="Подозрение на мультиаккаунт" />
        <option value="Технические работы платёжной системы, повторите позже" />
      </datalist>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Админ-панель</h1>
          <p className="text-sm text-muted-foreground">Ручное подтверждение карт и заявок</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href="/api/admin/api-docs"
            download
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Документация API
          </a>
          <form action={adminLogout}>
            <button type="submit" className="rounded-full border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-foreground/5">
              Выйти
            </button>
          </form>
        </div>
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
                      Карта привязана
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
                    {r.userName} ({r.userEmail}) —{" "}
                    {r.wallet ? `крипта ${r.asset ?? ""}` : `карта •••• ${r.cardLast4 ?? "—"}`}
                  </p>
                  {r.wallet && (
                    <p className="break-all font-mono text-xs text-foreground">{r.wallet}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                  {r.type === "deposit" && r.codeStatus === "awaiting" && (
                    <p className="mt-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      Ждём код от игрока…
                    </p>
                  )}
                  {r.type === "deposit" && r.codeStatus === "submitted" && r.code && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2">
                      <span className="text-xs font-semibold text-muted-foreground">Код от игрока</span>
                      <span className="font-mono text-xl font-bold tracking-[0.25em] text-foreground tabular-nums">{r.code}</span>
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  {r.type === "deposit" && r.codeStatus === "submitted" && (
                    <form action={requestDepositCodeAgain.bind(null, r.id)} className="w-full sm:w-auto">
                      <button type="submit" className="w-full rounded-full border border-border/60 px-4 py-2 text-sm font-semibold text-foreground hover:bg-foreground/5 sm:w-auto">
                        Запросить код ещё раз
                      </button>
                    </form>
                  )}
                  <form action={approveFundingRequest.bind(null, r.id)} className="w-full sm:w-auto">
                    <button type="submit" className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto">
                      Одобрить
                    </button>
                  </form>
                  <details className="group w-full sm:w-72">
                    <summary className="flex cursor-pointer list-none items-center justify-center rounded-full border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive [&::-webkit-details-marker]:hidden">
                      Отклонить
                    </summary>
                    <form action={rejectFundingRequest.bind(null, r.id)} className="mt-2 flex flex-col gap-2 rounded-2xl border border-border/60 bg-background p-3">
                      <label htmlFor={`reason-${r.id}`} className="text-xs font-semibold text-muted-foreground">
                        Причина отклонения (увидит игрок)
                      </label>
                      <input
                        id={`reason-${r.id}`}
                        name="reason"
                        list="reject-reasons"
                        required
                        maxLength={300}
                        placeholder="Выберите или впишите причину"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      />
                      <button type="submit" className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
                        Отклонить заявку
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
