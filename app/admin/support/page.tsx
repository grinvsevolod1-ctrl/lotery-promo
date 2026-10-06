import Link from "next/link"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getTicketCounts, listTemplates, listTickets, type TicketFilter } from "@/app/actions/admin-support"
import { AdminNav } from "@/components/admin/admin-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { TicketCard } from "@/components/admin/support/ticket-card"
import { TemplateManager } from "@/components/admin/support/template-manager"
import { getMailStatus } from "@/lib/email"

export const metadata = { title: "Поддержка — админка bytoloto.com", robots: { index: false, follow: false } }

const FILTERS: ReadonlyArray<{ value: TicketFilter; label: string }> = [
  { value: "open", label: "Открытые" },
  { value: "closed", label: "Закрытые" },
  { value: "all", label: "Все" },
]

function MailStatus() {
  const status = getMailStatus()
  const problem =
    status.transport === "none"
      ? "Почта не настроена: письма игрокам не отправляются. Добавьте RESEND_API_KEY или SMTP_HOST."
      : status.sandbox
        ? "Письма уходят с тестового адреса resend.dev — почтовые сервисы отправляют такие письма в спам. Подтвердите свой домен в Resend и задайте MAIL_FROM."
        : null

  return (
    <section
      aria-labelledby="mail-heading"
      className={`flex flex-col gap-3 rounded-3xl border p-5 ${problem ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mail-heading" className="font-display text-lg font-bold text-foreground">
          Почта и спам
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${problem ? "bg-destructive/15 text-destructive" : "bg-primary/12 text-primary"}`}
        >
          {problem ? "Нужна настройка" : "Настроена"}
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Способ отправки</dt>
          <dd className="font-semibold text-foreground">{status.transport === "smtp" ? "SMTP" : status.transport === "resend" ? "Resend" : "не задан"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Отправитель</dt>
          <dd className="break-all font-semibold text-foreground">{status.from || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ответы игроков приходят на</dt>
          <dd className="break-all font-semibold text-foreground">{status.replyTo}</dd>
        </div>
      </dl>

      {problem && <p role="alert" className="text-sm leading-relaxed text-destructive">{problem}</p>}

      <details className="text-sm text-muted-foreground">
        <summary className="w-fit cursor-pointer font-semibold text-foreground">Что сделать, чтобы письма не попадали в спам</summary>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
          <li>
            Отправлять с адреса на своём домене{status.senderDomain && !status.sandbox ? ` (сейчас ${status.senderDomain})` : ""}: задайте переменную{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground">MAIL_FROM</code>, например{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground">{`bytoloto <support@ваш-домен>`}</code>.
          </li>
          <li>Добавить домен в Resend (Domains) и внести у регистратора выданные DNS-записи SPF и DKIM — дождаться статуса Verified.</li>
          <li>
            Добавить запись DMARC: TXT <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground">_dmarc</code> со значением{" "}
            <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground">v=DMARC1; p=none</code>.
          </li>
          <li>Первые письма в Gmail/Mail.ru отметить «Не спам» — это ускоряет «прогрев» нового домена.</li>
        </ol>
      </details>
    </section>
  )
}

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login")
  const { status } = await searchParams
  const filter: TicketFilter = status === "closed" || status === "all" ? status : "open"

  const [tickets, templates, counts] = await Promise.all([listTickets(filter), listTemplates(), getTicketCounts()])

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={60_000} liveScope="admin" liveTopics={["admin:counts"]} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="support" subtitle="Обращения игроков и ответы по шаблонам" />

        <MailStatus />

        <section className="flex flex-col gap-4" aria-labelledby="tickets-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="tickets-heading" className="font-display text-lg font-bold text-foreground">
              Обращения
            </h2>
            <nav aria-label="Статус обращений" className="flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const isActive = item.value === filter
                return (
                  <Link
                    key={item.value}
                    href={item.value === "open" ? "/admin/support" : `/admin/support?status=${item.value}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label} <span className="tabular-nums">{counts[item.value]}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {tickets.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              {filter === "open" ? "Открытых обращений нет — всё обработано." : "Обращений по этому фильтру пока нет."}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} templates={templates} />
              ))}
            </ul>
          )}
        </section>

        <TemplateManager templates={templates} />
      </div>
    </main>
  )
}
