import { FileArchive } from "lucide-react"
import type { ViewerKind } from "@/lib/vault-kinds"
import { DataGrid } from "./data-grid"

function Note({ note }: { note: string | null }) {
  if (!note) return null
  return <p className="text-xs text-muted-foreground">{note}</p>
}

export function TextViewer({ source, note }: { source: string; note: string | null }) {
  const lines = source.split("\n")
  return (
    <section className="flex flex-col gap-2">
      <Note note={note} />
      <div className="overflow-auto rounded-2xl border border-border/60 bg-card/40 font-mono text-[13px] leading-6">
        <ol className="min-w-max">
          {lines.slice(0, 5000).map((line, i) => (
            <li key={i} className="flex gap-4 px-4 hover:bg-card/60">
              <span className="w-10 shrink-0 select-none text-right text-muted-foreground/60 tabular-nums">{i + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </li>
          ))}
        </ol>
        {lines.length > 5000 && <p className="px-4 py-2 text-xs text-muted-foreground">Ещё {lines.length - 5000} строк — скачайте файл.</p>}
      </div>
    </section>
  )
}

export function JsonViewer({ source, note }: { source: string; note: string | null }) {
  let pretty: string
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
    pretty = JSON.stringify(parsed, null, 2)
  } catch {
    return <TextViewer source={source} note={note ?? "Невалидный JSON — показан как текст."} />
  }
  // A flat array of objects is nicer as a table.
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    const columns = Array.from(new Set(parsed.flatMap((row) => Object.keys(row as object))))
    const rows = (parsed as Record<string, unknown>[]).map((row) => columns.map((c) => (row[c] === null || row[c] === undefined ? "∅" : typeof row[c] === "object" ? JSON.stringify(row[c]) : String(row[c]))))
    return (
      <section className="flex flex-col gap-4">
        <Note note={note} />
        <DataGrid title={`Массив · ${rows.length} объектов`} columns={columns} rows={rows} total={rows.length} />
        <details className="rounded-2xl border border-border/60 bg-card/40">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Исходный JSON</summary>
          <pre className="overflow-auto px-4 pb-4 font-mono text-[13px] leading-6">{pretty}</pre>
        </details>
      </section>
    )
  }
  return <TextViewer source={pretty} note={note} />
}

function parseCsv(source: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c !== ""))
}

export function CsvViewer({ source, note, delimiter }: { source: string; note: string | null; delimiter: string }) {
  const rows = parseCsv(source, delimiter)
  if (rows.length === 0) return <TextViewer source={source} note={note} />
  const [header, ...data] = rows
  return (
    <section className="flex flex-col gap-2">
      <Note note={note} />
      <DataGrid title={`Таблица · ${data.length} строк`} columns={header} rows={data.slice(0, 500)} total={data.length} />
    </section>
  )
}

export function MediaViewer({ kind, url, name }: { kind: ViewerKind; url: string; name: string }) {
  if (kind === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- served from our own API with auth cookie */}
        <img src={url} alt={name} className="mx-auto max-h-[75vh] w-auto rounded-xl object-contain" />
      </div>
    )
  }
  if (kind === "pdf") return <iframe src={url} title={name} className="h-[80vh] w-full rounded-2xl border border-border/60 bg-card" />
  if (kind === "audio") {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <audio controls preload="metadata" src={url} className="w-full">
          <track kind="captions" />
        </audio>
      </div>
    )
  }
  if (kind === "video") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <video controls preload="metadata" src={url} className="max-h-[75vh] w-full">
          <track kind="captions" />
        </video>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
      <FileArchive className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground text-pretty">Предпросмотр для этого типа недоступен — скачайте файл кнопкой выше.</p>
    </div>
  )
}
