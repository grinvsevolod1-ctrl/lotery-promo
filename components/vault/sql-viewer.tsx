"use client"

import { useMemo, useState } from "react"
import { Code2, KeyRound, Rows3, Table2 } from "lucide-react"
import { tokenizeSql, type SqlReport, type SqlTable } from "@/lib/sql-inspect"
import { DataGrid } from "./data-grid"

type Tab = "tables" | "statements" | "raw"

const DIALECT_LABEL: Record<SqlReport["dialect"], string> = { postgres: "PostgreSQL", mysql: "MySQL", sqlite: "SQLite", generic: "SQL" }

export function SqlViewer({ report, source, note }: { report: SqlReport; source: string; note: string | null }) {
  const [tab, setTab] = useState<Tab>(report.tables.length ? "tables" : "raw")
  const [selected, setSelected] = useState<string | null>(report.tables[0]?.name ?? null)
  const table = report.tables.find((t) => t.name === selected) ?? report.tables[0]
  const totalRows = report.tables.reduce((sum, t) => sum + t.totalRows, 0)

  return (
    <section className="flex flex-col gap-4">
      {(note || report.truncated) && (
        <p className="text-xs text-muted-foreground">{note ?? "Файл очень большой: разобрана первая часть, полный текст — в скачанном файле."}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Диалект" value={DIALECT_LABEL[report.dialect]} />
        <Stat label="Таблиц" value={String(report.tables.length)} />
        <Stat label="Строк данных" value={totalRows.toLocaleString("ru-RU")} />
        <Stat label="Инструкций" value={report.statements.length.toLocaleString("ru-RU")} />
      </div>

      <div role="tablist" aria-label="Вид" className="inline-flex w-fit rounded-xl bg-card/60 p-1">
        {(
          [
            ["tables", "Таблицы", Table2],
            ["statements", "Инструкции", Rows3],
            ["raw", "Исходник", Code2],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "tables" &&
        (report.tables.length === 0 ? (
          <Empty text="В файле нет CREATE TABLE, INSERT или COPY — смотрите вкладки «Инструкции» и «Исходник»." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <nav aria-label="Таблицы" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {report.tables.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelected(t.name)}
                  aria-current={table?.name === t.name ? "true" : undefined}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition lg:w-full ${
                    table?.name === t.name ? "border-primary/50 bg-primary/10" : "border-border/60 bg-card/40 hover:border-primary/30"
                  }`}
                >
                  <span className="truncate font-semibold">{t.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{t.totalRows.toLocaleString("ru-RU")}</span>
                </button>
              ))}
            </nav>
            {table && <TableView table={table} />}
          </div>
        ))}

      {tab === "statements" && <Statements report={report} />}

      {tab === "raw" && <RawSql source={source} />}
    </section>
  )
}

function TableView({ table }: { table: SqlTable }) {
  const primary = new Set(table.columns.filter((c) => c.primary).map((c) => c.name))
  const columns = table.rowColumns.length ? table.rowColumns : table.columns.map((c) => c.name)
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {table.columns.length > 0 && (
        <details className="rounded-2xl border border-border/60 bg-card/40" open={table.totalRows === 0}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
            Структура · {table.columns.length} колонок
          </summary>
          <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
            {table.columns.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 rounded-lg bg-background/50 px-3 py-2 text-sm">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {c.primary && <KeyRound className="size-3.5 shrink-0 text-primary" aria-label="Первичный ключ" />}
                  <span className="truncate font-mono">{c.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.type}
                  {!c.nullable && " · not null"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {table.totalRows > 0 ? (
        <DataGrid title={`${table.name} · ${table.totalRows.toLocaleString("ru-RU")} строк`} columns={columns} rows={table.rows} total={table.totalRows} primary={primary} />
      ) : (
        <Empty text="Данных для этой таблицы в файле нет — только структура." />
      )}
    </div>
  )
}

function Statements({ report }: { report: SqlReport }) {
  const [kind, setKind] = useState<string>("all")
  const kinds = Object.entries(report.counts).sort((a, b) => b[1] - a[1])
  const rows = report.statements.filter((s) => kind === "all" || s.kind === kind)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Chip active={kind === "all"} onClick={() => setKind("all")} label={`Все · ${report.statements.length}`} />
        {kinds.map(([k, n]) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)} label={`${k} · ${n}`} />
        ))}
      </div>
      <ol className="flex max-h-[70vh] flex-col divide-y divide-border/40 overflow-auto rounded-2xl border border-border/60 bg-card/40">
        {rows.slice(0, 1000).map((s, i) => (
          <li key={i} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-wide text-primary">{s.kind}</span>
            {s.table && <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.table}</span>}
            <span className="min-w-0 truncate font-mono text-xs text-foreground/80">{s.preview}</span>
          </li>
        ))}
        {rows.length > 1000 && <li className="px-4 py-2 text-xs text-muted-foreground">Ещё {rows.length - 1000} инструкций…</li>}
      </ol>
    </div>
  )
}

const RAW_CAP = 400_000

function RawSql({ source }: { source: string }) {
  const [showAll, setShowAll] = useState(false)
  const text = showAll ? source : source.slice(0, RAW_CAP)
  const tokens = useMemo(() => tokenizeSql(text), [text])
  return (
    <div className="flex flex-col gap-2">
      <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/60 bg-card/40 p-4 font-mono text-[13px] leading-6">
        {tokens.map(([cls, value], i) => (
          <span key={i} className={TOKEN_CLASS[cls]}>
            {value}
          </span>
        ))}
      </pre>
      {!showAll && source.length > RAW_CAP && (
        <button type="button" onClick={() => setShowAll(true)} className="w-fit text-sm font-semibold text-primary hover:underline">
          Показать весь текст ({(source.length / 1024).toFixed(0)} КБ)
        </button>
      )}
    </div>
  )
}

const TOKEN_CLASS: Record<string, string> = {
  kw: "text-primary font-semibold",
  str: "text-gold",
  num: "text-accent-foreground",
  cmt: "text-muted-foreground/70 italic",
  id: "",
  op: "text-muted-foreground",
  ws: "",
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-display text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`h-8 rounded-full px-3 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}>
      {label}
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center text-sm text-muted-foreground text-pretty">{text}</p>
}
