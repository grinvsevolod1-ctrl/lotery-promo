import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { approveVerification, getVerificationQueue, rejectVerification } from "@/app/actions/verification"
import { AdminNav } from "@/components/admin/admin-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { DOCUMENT_TYPES, STATUS_LABEL, type DocumentType } from "@/lib/verification"
import { formatDateTime } from "@/lib/format"

export const metadata = { title: "Верификация — админка bytoloto.com", robots: { index: false, follow: false } }

const STATUS_TONE = {
  pending: "bg-primary/15 text-primary",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
} as const

export default async function AdminVerificationPage() {
  if (!(await isAdmin())) redirect("/admin/login")
  const rows = await getVerificationQueue()
  const pending = rows.filter((r) => r.status === "pending")
  const reviewed = rows.filter((r) => r.status !== "pending")

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={60_000} liveScope="admin" liveTopics={["admin:verification"]} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="verification" subtitle="Проверка личности игроков" />

        {[
          { title: `Ожидают проверки (${pending.length})`, items: pending, empty: "Новых заявок нет." },
          { title: "Проверенные", items: reviewed, empty: "Пока пусто." },
        ].map((group) => (
          <section key={group.title} className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="font-display text-lg font-bold text-foreground">{group.title}</h2>
            {group.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">{group.empty}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {group.items.map((r) => (
                  <li key={r.userId} className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {[r.lastName, r.firstName, r.middleName].filter(Boolean).join(" ")}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.userName} · {r.userEmail} · {formatDateTime(r.submittedAt)}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      <div className="flex gap-2"><dt className="text-muted-foreground">Рождение:</dt><dd className="text-foreground">{r.birthDate}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Гражданство:</dt><dd className="text-foreground">{r.citizenship}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Документ:</dt><dd className="text-foreground">{DOCUMENT_TYPES[r.documentType as DocumentType] ?? r.documentType} {r.documentNumber}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Личный №:</dt><dd className="font-mono text-foreground">{r.personalNumber || "—"}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Телефон:</dt><dd className="text-foreground">{r.phone}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Адрес:</dt><dd className="text-foreground">{r.address}</dd></div>
                    </dl>
                    {r.note && <p className="text-sm text-destructive">Причина: {r.note}</p>}
                    {r.status !== "approved" && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <form action={approveVerification.bind(null, r.userId)}>
                          <button type="submit" className="h-10 rounded-full bg-success px-5 text-sm font-semibold text-success-foreground">
                            Подтвердить
                          </button>
                        </form>
                        {r.status === "pending" && (
                          <form action={rejectVerification.bind(null, r.userId)} className="flex flex-1 gap-2">
                            <input
                              name="note"
                              maxLength={300}
                              placeholder="Причина отказа"
                              aria-label="Причина отказа"
                              className="h-10 min-w-0 flex-1 rounded-full border border-border/60 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground"
                            />
                            <button type="submit" className="h-10 shrink-0 rounded-full border border-destructive/40 px-5 text-sm font-semibold text-destructive">
                              Отклонить
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
