import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Download, ExternalLink } from "lucide-react"
import { isVaultUnlocked } from "@/lib/vault-auth"
import { getVaultFile, vaultTotals } from "@/lib/vault-files"
import { readHead } from "@/lib/vault-storage"
import { KIND_LABEL, extensionOf, viewerKind } from "@/lib/vault-kinds"
import { inspectSql } from "@/lib/sql-inspect"
import { formatDateTime } from "@/lib/format"
import { VaultShell } from "@/components/vault/vault-shell"
import { formatBytes } from "@/lib/format-bytes"
import { SqlViewer } from "@/components/vault/sql-viewer"
import { TextViewer, JsonViewer, CsvViewer, MediaViewer } from "@/components/vault/file-viewers"
import { DeleteFileButton } from "@/components/vault/delete-file-button"

export const dynamic = "force-dynamic"

/** Text views are capped so a huge dump never blows up the page; the full file is always downloadable. */
const TEXT_CAP = 12 * 1024 * 1024

async function decodeText(file: { name: string; size: number; data: Buffer | null; storagePath: string | null }) {
  const ext = extensionOf(file.name)
  const gzip = ext === "sql.gz" || ext === "gz"
  const head = await readHead(file, gzip, TEXT_CAP)
  if ("error" in head) return { text: null, note: head.error }
  const text = head.bytes.toString("utf8")
  if (!head.truncated) return { text, note: null }
  const total = gzip ? "" : ` из ${formatBytes(file.size)}`
  return { text, note: `Показаны первые ${formatBytes(TEXT_CAP)}${total}${gzip ? " распакованных данных" : ""}. Файл целиком можно скачать.` }
}

export default async function VaultFilePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isVaultUnlocked())) redirect("/vault")
  const { id } = await params
  const fileId = Number(id)
  if (!Number.isInteger(fileId) || fileId <= 0) notFound()
  const [file, totals] = await Promise.all([getVaultFile(fileId), vaultTotals()])
  if (!file) notFound()

  const kind = viewerKind(file.name, file.mimeType)
  const sender = file.senderName || (file.senderUsername ? `@${file.senderUsername}` : file.senderId ? `id ${file.senderId}` : "неизвестно")
  const rawUrl = `/api/vault/files/${file.id}`

  let body: React.ReactNode
  if (kind === "sql" || kind === "text" || kind === "json" || kind === "csv") {
    const { text, note } = await decodeText(file)
    if (text === null) body = <p className="text-sm text-destructive">{note}</p>
    else if (kind === "sql") body = <SqlViewer report={inspectSql(text)} source={text} note={note} />
    else if (kind === "json") body = <JsonViewer source={text} note={note} />
    else if (kind === "csv") body = <CsvViewer source={text} note={note} delimiter={extensionOf(file.name) === "tsv" ? "\t" : ","} />
    else body = <TextViewer source={text} note={note} />
  } else {
    body = <MediaViewer kind={kind} url={`${rawUrl}?inline=1`} name={file.name} />
  }

  return (
    <VaultShell totals={totals}>
      <article className="flex flex-col gap-5">
        <Link href="/vault" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          Ко всем файлам
        </Link>

        <header className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/50 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{KIND_LABEL[kind]}</span>
              <span className="text-xs text-muted-foreground">{file.mimeType}</span>
            </div>
            <h1 className="mt-2 break-all font-display text-xl font-extrabold sm:text-2xl">{file.name}</h1>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <Meta label="Размер" value={formatBytes(file.size)} />
              <Meta label="Получен" value={formatDateTime(file.receivedAt)} />
              <Meta label="Отправитель" value={sender} />
              <Meta label="Чат" value={file.chatId} />
              {file.caption && <Meta label="Подпись" value={file.caption} wide />}
            </dl>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href={rawUrl} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
              <Download className="size-4" aria-hidden />
              Скачать
            </a>
            <a href={`${rawUrl}?inline=1`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-semibold transition hover:bg-card">
              <ExternalLink className="size-4" aria-hidden />
              Открыть
            </a>
            <DeleteFileButton id={file.id} />
          </div>
        </header>

        {body}
      </article>
    </VaultShell>
  )
}

function Meta({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 break-words text-foreground">{value}</dd>
    </div>
  )
}
