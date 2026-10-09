"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Database, FileArchive, FileAudio2, FileImage, FileJson2, FileSpreadsheet, FileText, FileVideo2, Inbox, Search } from "lucide-react"
import { KIND_LABEL, viewerKind, type ViewerKind } from "@/lib/vault-kinds"
import { formatDateTime } from "@/lib/format"
import { formatBytes } from "@/lib/format-bytes"

export type FileRow = {
  id: number
  kind: string
  name: string
  mimeType: string
  size: number
  caption: string | null
  chatId: string
  senderId: string | null
  senderName: string | null
  senderUsername: string | null
  receivedAt: string
}

const ICON: Record<ViewerKind, typeof FileText> = {
  sql: Database,
  json: FileJson2,
  csv: FileSpreadsheet,
  text: FileText,
  image: FileImage,
  pdf: FileText,
  audio: FileAudio2,
  video: FileVideo2,
  binary: FileArchive,
}

type Filter = "all" | "sql" | "other"

export function FileList({ files }: { files: FileRow[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return files
      .map((f) => ({ ...f, viewer: viewerKind(f.name, f.mimeType) }))
      .filter((f) => (filter === "all" ? true : filter === "sql" ? f.viewer === "sql" : f.viewer !== "sql"))
      .filter((f) => !q || [f.name, f.caption, f.senderName, f.senderUsername, f.senderId].some((v) => v?.toLowerCase().includes(q)))
  }, [files, query, filter])

  const sqlCount = files.filter((f) => viewerKind(f.name, f.mimeType) === "sql").length

  return (
    <section className="flex flex-col gap-4" aria-labelledby="vault-files-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 id="vault-files-title" className="font-display text-2xl font-extrabold">
          Загрузка
        </h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="Фильтр" className="inline-flex rounded-xl bg-card/60 p-1">
            {(
              [
                ["all", `Все · ${files.length}`],
                ["sql", `SQL · ${sqlCount}`],
                ["other", `Другие · ${files.length - sqlCount}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${filter === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Поиск по файлам</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя, отправитель, подпись"
              className="h-10 w-full rounded-xl border border-border/60 bg-card/60 pl-9 pr-3 text-sm outline-none transition focus:border-primary/60 sm:w-64"
            />
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 px-6 py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground text-pretty">
            {files.length === 0 ? "Пока пусто. Отправьте боту файл — он появится здесь." : "Ничего не найдено по этому фильтру."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((f) => {
            const Icon = ICON[f.viewer]
            const sender = f.senderName || (f.senderUsername ? `@${f.senderUsername}` : f.senderId ? `id ${f.senderId}` : "неизвестно")
            return (
              <li key={f.id}>
                <Link
                  href={`/vault/files/${f.id}`}
                  className={`group flex gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-primary/50 ${
                    f.viewer === "sql" ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card/50"
                  }`}
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${f.viewer === "sql" ? "bg-primary/15 text-primary" : "bg-card text-muted-foreground"}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold">{f.name}</span>
                      <span className="shrink-0 rounded-md bg-card px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{KIND_LABEL[f.viewer]}</span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatBytes(f.size)} · {sender} · {formatDateTime(f.receivedAt)}
                    </span>
                    {f.caption && <span className="line-clamp-2 text-xs text-foreground/80">{f.caption}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
