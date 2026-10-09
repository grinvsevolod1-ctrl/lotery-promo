"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

const PAGE = 50

/** Scrollable table with sticky header, client-side search and paging. Rows are already strings. */
export function DataGrid({ title, columns, rows, total, primary }: { title?: string; columns: string[]; rows: string[][]; total: number; primary?: Set<string> }) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)))
  }, [rows, query])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages - 1)
  const slice = filtered.slice(current * PAGE, current * PAGE + PAGE)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="flex items-center gap-2">
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Поиск по строкам</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Поиск"
              className="h-9 w-full rounded-lg border border-border/60 bg-background/60 pl-8 pr-3 text-sm outline-none focus:border-primary/60 sm:w-48"
            />
          </label>
          {pages > 1 && (
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <button type="button" aria-label="Назад" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={current === 0} className="grid size-9 place-items-center rounded-lg hover:bg-card disabled:opacity-40">
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="tabular-nums">
                {current + 1} / {pages}
              </span>
              <button type="button" aria-label="Вперёд" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={current >= pages - 1} className="grid size-9 place-items-center rounded-lg hover:bg-card disabled:opacity-40">
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-border/40">
        <table className="min-w-full border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 border-b border-border/60 bg-card px-3 py-2 text-right text-xs font-semibold text-muted-foreground">#</th>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap border-b border-border/60 px-3 py-2 text-left text-xs font-semibold">
                  <span className={primary?.has(c) ? "text-primary" : ""}>{c}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={i} className="odd:bg-background/30 hover:bg-primary/5">
                <td className="sticky left-0 z-10 border-b border-border/30 bg-card px-3 py-1.5 text-right text-xs text-muted-foreground tabular-nums">{current * PAGE + i + 1}</td>
                {columns.map((_, j) => {
                  const value = row[j] ?? ""
                  const empty = value === "∅"
                  return (
                    <td key={j} className={`max-w-[28rem] truncate border-b border-border/30 px-3 py-1.5 font-mono ${empty ? "text-muted-foreground/60" : ""}`} title={value.length > 60 ? value : undefined}>
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Нет строк
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > rows.length && <p className="text-xs text-muted-foreground">Загружены первые {rows.length} из {total} строк — полный набор в скачанном файле.</p>}
    </div>
  )
}
