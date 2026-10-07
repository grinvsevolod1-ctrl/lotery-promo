import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import {
  approveVerification,
  confirmVerificationCode,
  declineVerificationCode,
  getVerificationQueue,
  markNoMsiNumber,
  rejectVerification,
  requestExtraVerification,
} from "@/app/actions/verification"
import { AdminNav } from "@/components/admin/admin-nav"
import { AutoRefresh } from "@/components/auto-refresh"
import { DOCUMENT_TYPES, STATUS_LABEL, stageTitle, type DocumentType } from "@/lib/verification"
import { formatDateTime } from "@/lib/format"

export const metadata = { title: "Верификация — админка bytoloto.com", robots: { index: false, follow: false } }

const STATUS_TONE = {
  none: "bg-muted text-muted-foreground",
  code: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  code_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pending: "bg-primary/15 text-primary",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  no_msi: "bg-destructive/15 text-destructive",
} as const

const BUTTON = "h-10 rounded-full px-5 text-sm font-semibold"

export default async function AdminVerificationPage() {
  if (!(await isAdmin())) redirect("/admin/login")
  const rows = await getVerificationQueue()
  const actionable = rows.filter((r) => r.status === "pending" || r.status === "code_review")
  const waiting = rows.filter((r) => r.status === "code")
  const reviewed = rows.filter((r) => r.status === "approved" || r.status === "rejected" || r.status === "no_msi")

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={60_000} liveScope="admin" liveTopics={["admin:verification"]} />
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="verification" subtitle="Проверка личности игроков" />

        {[
          { title: `Нужно решение (${actionable.length})`, items: actionable, empty: "Новых заявок нет." },
          { title: `Ждём код от игрока (${waiting.length})`, items: waiting, empty: "Пусто." },
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
                    {(r.status === "code" || r.status === "code_review") && (
                      <p className="rounded-2xl bg-muted px-4 py-2 text-sm text-foreground">
                        {stageTitle(r.stage)} · выдан <span className="font-mono font-bold">{r.testCode ?? "—"}</span>
                        {r.status === "code_review" && (
                          <>
                            {" · введён "}
                            <span className="font-mono font-bold">{r.enteredCode ?? "—"}</span>
                            {r.enteredCode === r.testCode ? " (совпадает)" : " (не совпадает)"}
                          </>
                        )}
                      </p>
                    )}
                    {r.status !== "approved" && r.status !== "rejected" && (
                      <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
                        {r.status === "code_review" && (
                          <>
                            <form action={confirmVerificationCode.bind(null, r.userId)}>
                              <button type="submit" className={`${BUTTON} w-full bg-success text-success-foreground`}>Код верный</button>
                            </form>
                            <form action={declineVerificationCode.bind(null, r.userId)}>
                              <button type="submit" className={`${BUTTON} w-full border border-border/60 text-foreground`}>Код неверный</button>
                            </form>
                            <form action={markNoMsiNumber.bind(null, r.userId)}>
                              <button type="submit" className={`${BUTTON} w-full border border-destructive/40 text-destructive`}>Нет номера в МСИ</button>
                            </form>
                          </>
                        )}
                        {r.status === "pending" && (
                          <>
                            <form action={requestExtraVerification.bind(null, r.userId)}>
                              <button type="submit" className={`${BUTTON} w-full bg-primary text-primary-foreground`}>Доп. проверка</button>
                            </form>
                            <form action={approveVerification.bind(null, r.userId)}>
                              <button type="submit" className={`${BUTTON} w-full bg-success text-success-foreground`}>Завершить</button>
                            </form>
                          </>
                        )}
                        {(
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
