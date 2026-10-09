import { Download } from "lucide-react"
import {
  approveJobApplication,
  confirmJobCode,
  declineJobCode,
  markJobNoMsi,
  rejectJobApplication,
  requestJobExtraCheck,
} from "@/app/actions/admin-jobs"
import type { AdminApplicationRow } from "@/lib/jobs-data"
import { APPLICATION_STATUS_LABEL, formatFileSize, jobStageTitle, type ApplicationStatus } from "@/lib/jobs"
import { formatDateTime } from "@/lib/format"

const STATUS_TONE: Record<ApplicationStatus, string> = {
  code: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  code_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pending: "bg-primary/15 text-primary",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  no_msi: "bg-destructive/15 text-destructive",
}

const BUTTON = "h-10 rounded-full px-5 text-sm font-semibold"

function ApplicationItem({ r }: { r: AdminApplicationRow }) {
  const open = r.status !== "approved" && r.status !== "rejected"
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {r.fullName} <span className="font-normal text-muted-foreground">· {r.vacancyTitle}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            №{r.id} · {r.email} · {r.phone} · {formatDateTime(r.submittedAt)}
            {r.ip ? ` · ${r.ip}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`}>{APPLICATION_STATUS_LABEL[r.status]}</span>
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Личный №:</dt>
          <dd className="font-mono text-foreground">{r.personalNumber}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Письмо «принята»:</dt>
          <dd className="text-foreground">{r.acceptedMailAt ? formatDateTime(r.acceptedMailAt) : "ещё нет"}</dd>
        </div>
      </dl>

      <details className="group rounded-2xl bg-muted/60 px-4 py-2 text-sm">
        <summary className="cursor-pointer select-none font-semibold text-foreground">О себе</summary>
        <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">{r.about}</p>
      </details>

      {r.files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {r.files.map((f) => (
            <li key={f.id}>
              <a
                href={`/api/admin/jobs/files/${f.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/60 px-4 text-sm text-foreground hover:bg-foreground/5"
              >
                <Download className="size-3.5" aria-hidden />
                <span className="max-w-[14rem] truncate">{f.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{formatFileSize(f.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {r.note && <p className="text-sm text-destructive">Причина: {r.note}</p>}

      {(r.status === "code" || r.status === "code_review") && (
        <p className="rounded-2xl bg-muted px-4 py-2 text-sm text-foreground">
          {jobStageTitle(r.stage)} · выдан <span className="font-mono font-bold">{r.code ?? "—"}</span>
          {r.status === "code_review" && (
            <>
              {" · введён "}
              <span className="font-mono font-bold">{r.enteredCode ?? "—"}</span>
              {r.enteredCode === r.code ? " (совпадает)" : " (не совпадает)"}
            </>
          )}
        </p>
      )}

      {open && (
        <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-center">
          {r.status === "code_review" && (
            <>
              <form action={confirmJobCode.bind(null, r.id)}>
                <button type="submit" className={`${BUTTON} w-full bg-success text-success-foreground`}>
                  Код верный
                </button>
              </form>
              <form action={declineJobCode.bind(null, r.id)}>
                <button type="submit" className={`${BUTTON} w-full border border-border/60 text-foreground`}>
                  Код неверный
                </button>
              </form>
              <form action={markJobNoMsi.bind(null, r.id)}>
                <button type="submit" className={`${BUTTON} w-full border border-destructive/40 text-destructive`}>
                  Нет номера в МСИ
                </button>
              </form>
            </>
          )}
          {r.status === "pending" && (
            <>
              <form action={requestJobExtraCheck.bind(null, r.id)}>
                <button type="submit" className={`${BUTTON} w-full bg-primary text-primary-foreground`}>
                  Доп. проверка
                </button>
              </form>
              <form action={approveJobApplication.bind(null, r.id)}>
                <button type="submit" className={`${BUTTON} w-full bg-success text-success-foreground`}>
                  Одобрить
                </button>
              </form>
            </>
          )}
          {r.status !== "no_msi" && (
            <form action={rejectJobApplication.bind(null, r.id)} className="flex flex-1 gap-2">
              <input
                name="note"
                maxLength={300}
                placeholder="Комментарий кандидату"
                aria-label="Комментарий кандидату"
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
  )
}

export function ApplicationsQueue({ rows }: { rows: AdminApplicationRow[] }) {
  const actionable = rows.filter((r) => r.status === "pending" || r.status === "code_review")
  const waiting = rows.filter((r) => r.status === "code")
  const reviewed = rows.filter((r) => r.status === "approved" || r.status === "rejected" || r.status === "no_msi")

  return (
    <>
      {[
        { title: `Нужно решение (${actionable.length})`, items: actionable, empty: "Новых анкет нет." },
        { title: `Ждём код от кандидата (${waiting.length})`, items: waiting, empty: "Пусто." },
        { title: "Рассмотренные", items: reviewed, empty: "Пока пусто." },
      ].map((group) => (
        <section key={group.title} className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5">
          <h2 className="font-display text-lg font-bold text-foreground">{group.title}</h2>
          {group.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">{group.empty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {group.items.map((r) => (
                <ApplicationItem key={r.id} r={r} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
