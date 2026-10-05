import type { Metadata } from "next"
import { getSupportRequests } from "@/app/actions/support"
import { PageHeading } from "@/components/account/page-heading"
import { SupportForm } from "@/components/account/support-form"
import { SUPPORT_TOPICS } from "@/lib/support-topics"
import { formatDateTime } from "@/lib/format"
import { requireSession } from "@/lib/require-session"

export const metadata: Metadata = { title: "Поддержка — bytoloto.com" }

export default async function SupportPage() {
  await requireSession()
  const requests = await getSupportRequests()

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Мы на связи" title="Поддержка" description="Опишите вопрос — обращение сразу получит специалист, а вам на почту придёт подтверждение с номером." />
      <SupportForm />

      {requests.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-foreground">Мои обращения</h2>
          <ul className="flex flex-col gap-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-3xl bg-card p-4 ring-1 ring-border">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">
                    №{r.id} · {SUPPORT_TOPICS[r.topic] ?? r.topic}
                  </p>
                  <span className={r.status === "open" ? "rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold text-primary" : "rounded-full bg-foreground/8 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"}>
                    {r.status === "open" ? "В работе" : "Закрыто"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{r.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
