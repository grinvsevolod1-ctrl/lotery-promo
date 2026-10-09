/**
 * Turns a SQL dump into a structure the vault can render: tables with their columns and the rows
 * found in INSERT statements and pg_dump COPY blocks. Pure string work, no database involved.
 */

export type SqlColumn = { name: string; type: string; nullable: boolean; primary: boolean }
export type SqlTable = {
  name: string
  columns: SqlColumn[]
  /** Column order used by rows; falls back to CREATE TABLE order when INSERT lists no columns. */
  rowColumns: string[]
  rows: string[][]
  /** Rows beyond MAX_ROWS_PER_TABLE are counted but not kept. */
  totalRows: number
}
export type SqlStatement = { kind: string; preview: string; table?: string }
export type SqlReport = {
  dialect: "postgres" | "mysql" | "sqlite" | "generic"
  tables: SqlTable[]
  statements: SqlStatement[]
  counts: Record<string, number>
  truncated: boolean
}

export const MAX_ROWS_PER_TABLE = 500
const MAX_STATEMENTS = 2000
const MAX_INPUT = 12 * 1024 * 1024

/** Splits on `;` outside quotes, comments and dollar-quoted bodies; pulls out pg_dump COPY blocks whole. */
function splitStatements(input: string): string[] {
  const out: string[] = []
  let buf = ""
  let i = 0
  const n = input.length
  let quote: string | null = null
  let dollar: string | null = null
  while (i < n) {
    const ch = input[i]
    const next = input[i + 1]
    if (dollar) {
      if (input.startsWith(dollar, i)) {
        buf += dollar
        i += dollar.length
        dollar = null
      } else {
        buf += ch
        i++
      }
      continue
    }
    if (quote) {
      buf += ch
      if (ch === "\\" && quote !== "`") {
        buf += next ?? ""
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === "-" && next === "-") {
      const end = input.indexOf("\n", i)
      i = end === -1 ? n : end
      continue
    }
    if (ch === "/" && next === "*") {
      const end = input.indexOf("*/", i + 2)
      i = end === -1 ? n : end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch
      buf += ch
      i++
      continue
    }
    if (ch === "$") {
      const m = /^\$[A-Za-z_]*\$/.exec(input.slice(i, i + 64))
      if (m) {
        dollar = m[0]
        buf += dollar
        i += dollar.length
        continue
      }
    }
    if (ch === ";") {
      const trimmed = buf.trim()
      if (trimmed) {
        out.push(trimmed)
        if (out.length >= MAX_STATEMENTS) return out
      }
      buf = ""
      i++
      // COPY ... FROM stdin; is followed by raw rows until a line with "\."
      if (/^copy\s/i.test(trimmed) && /from\s+stdin/i.test(trimmed)) {
        const end = input.indexOf("\n\\.", i)
        const block = end === -1 ? input.slice(i) : input.slice(i, end)
        out.push(`\u0000COPYDATA\u0000${trimmed}\u0000${block.replace(/^\n/, "")}`)
        i = end === -1 ? n : end + 3
      }
      continue
    }
    buf += ch
    i++
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

function unquoteIdent(raw: string) {
  const trimmed = raw.trim()
  const parts = trimmed.split(".").map((p) => p.trim().replace(/^["`\[]|["`\]]$/g, ""))
  // Drop the default schema so "public.users" and "users" land in the same table.
  if (parts.length > 1 && parts[0].toLowerCase() === "public") parts.shift()
  return parts.join(".")
}

/** Splits a comma-separated list at depth 0, honouring quotes and parentheses. */
function splitTopLevel(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote: string | null = null
  let buf = ""
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      buf += ch
      if (ch === "\\") {
        buf += input[i + 1] ?? ""
        i++
        continue
      }
      if (ch === quote) {
        if (input[i + 1] === quote) {
          buf += quote
          i++
        } else quote = null
      }
      continue
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch
      buf += ch
      continue
    }
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      out.push(buf.trim())
      buf = ""
      continue
    }
    buf += ch
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

function literalToText(raw: string): string {
  const v = raw.trim()
  if (/^null$/i.test(v)) return "∅"
  if (/^E?'/i.test(v) && v.endsWith("'")) {
    const inner = v.replace(/^E?'/i, "").slice(0, -1)
    return inner.replace(/''/g, "'").replace(/\\n/g, "\n").replace(/\\'/g, "'")
  }
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"')
  return v
}

const CONSTRAINT_WORDS = /^(constraint|primary\s+key|foreign\s+key|unique|check|key|index|exclude)\b/i

function parseCreateTable(stmt: string): SqlTable | null {
  const m = /^create\s+(?:temp(?:orary)?\s+|unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(([\s\S]*)\)\s*[^)]*$/i.exec(stmt)
  if (!m) return null
  const name = unquoteIdent(m[1])
  const body = m[2]
  const columns: SqlColumn[] = []
  const primaries = new Set<string>()
  for (const part of splitTopLevel(body)) {
    if (CONSTRAINT_WORDS.test(part)) {
      const pk = /primary\s+key\s*\(([^)]*)\)/i.exec(part)
      if (pk) pk[1].split(",").forEach((c) => primaries.add(unquoteIdent(c)))
      continue
    }
    const cm = /^("[^"]+"|`[^`]+`|\[[^\]]+\]|\S+)\s+([\s\S]*)$/.exec(part)
    if (!cm) continue
    const colName = unquoteIdent(cm[1])
    const rest = cm[2]
    const typeMatch = /^([A-Za-z_][\w\s]*?(?:\([^)]*\))?(?:\[\])*)(?=\s+(?:not\s+null|null|default|primary|unique|references|check|constraint|generated|collate|identity|auto_increment)\b|\s*$)/i.exec(rest)
    const type = (typeMatch?.[1] ?? rest.split(/\s+/)[0] ?? "").trim()
    const primary = /primary\s+key/i.test(rest)
    if (primary) primaries.add(colName)
    columns.push({ name: colName, type, nullable: !/\bnot\s+null\b/i.test(rest) && !primary, primary })
  }
  for (const col of columns) if (primaries.has(col.name)) col.primary = true
  return { name, columns, rowColumns: columns.map((c) => c.name), rows: [], totalRows: 0 }
}

function parseInsert(stmt: string): { table: string; columns: string[] | null; rows: string[][] } | null {
  const m = /^(?:insert|replace)\s+(?:ignore\s+)?into\s+([^\s(]+)\s*(\(([^)]*)\))?\s*values\s*([\s\S]*)$/i.exec(stmt)
  if (!m) return null
  const table = unquoteIdent(m[1])
  const columns = m[3] ? splitTopLevel(m[3]).map(unquoteIdent) : null
  const rows: string[][] = []
  const tuples = m[4].replace(/\s+on\s+(conflict|duplicate)[\s\S]*$/i, "").replace(/\s+returning[\s\S]*$/i, "")
  for (const tuple of splitTopLevel(tuples)) {
    const inner = tuple.trim().replace(/^\(/, "").replace(/\)$/, "")
    rows.push(splitTopLevel(inner).map(literalToText))
  }
  return { table, columns, rows }
}

function parseCopy(header: string, block: string): { table: string; columns: string[] | null; rows: string[][] } | null {
  const m = /^copy\s+([^\s(]+)\s*(\(([^)]*)\))?\s+from\s+stdin/i.exec(header)
  if (!m) return null
  const table = unquoteIdent(m[1])
  const columns = m[3] ? splitTopLevel(m[3]).map(unquoteIdent) : null
  const rows = block
    .split("\n")
    .filter((line) => line.length > 0 && line !== "\\.")
    .map((line) => line.split("\t").map((cell) => (cell === "\\N" ? "∅" : cell.replace(/\\t/g, "\t").replace(/\\n/g, "\n").replace(/\\\\/g, "\\"))))
  return { table, columns, rows }
}

function classify(stmt: string): string {
  const head = stmt.slice(0, 40).toLowerCase()
  if (head.startsWith("create table")) return "CREATE TABLE"
  if (head.startsWith("create index") || head.startsWith("create unique index")) return "CREATE INDEX"
  if (head.startsWith("create")) return "CREATE"
  if (head.startsWith("alter table")) return "ALTER TABLE"
  if (head.startsWith("alter")) return "ALTER"
  if (head.startsWith("insert") || head.startsWith("replace")) return "INSERT"
  if (head.startsWith("copy")) return "COPY"
  if (head.startsWith("update")) return "UPDATE"
  if (head.startsWith("delete")) return "DELETE"
  if (head.startsWith("drop")) return "DROP"
  if (head.startsWith("select")) return "SELECT"
  if (head.startsWith("set ") || head.startsWith("set\n")) return "SET"
  if (head.startsWith("comment")) return "COMMENT"
  if (head.startsWith("grant") || head.startsWith("revoke")) return "GRANT"
  if (head.startsWith("begin") || head.startsWith("commit") || head.startsWith("start transaction")) return "TRANSACTION"
  if (head.startsWith("lock")) return "LOCK"
  return "OTHER"
}

function detectDialect(input: string): SqlReport["dialect"] {
  const head = input.slice(0, 20_000)
  if (/pg_dump|\bCOPY\s+[\w."]+\s*\(|SERIAL\b|\bBIGSERIAL\b|SET search_path|OWNER TO/i.test(head)) return "postgres"
  if (/ENGINE=|AUTO_INCREMENT|`[^`]+`\s+(int|varchar)|LOCK TABLES|MySQL dump/i.test(head)) return "mysql"
  if (/sqlite_sequence|PRAGMA\s/i.test(head)) return "sqlite"
  return "generic"
}

export function inspectSql(source: string): SqlReport {
  const truncated = source.length > MAX_INPUT
  const input = truncated ? source.slice(0, MAX_INPUT) : source
  const tables = new Map<string, SqlTable>()
  const statements: SqlStatement[] = []
  const counts: Record<string, number> = {}

  const ensureTable = (name: string, columns: string[] | null, width: number) => {
    let table = tables.get(name)
    if (!table) {
      table = { name, columns: [], rowColumns: [], rows: [], totalRows: 0 }
      tables.set(name, table)
    }
    if (table.rowColumns.length === 0) {
      table.rowColumns = columns ?? (table.columns.length ? table.columns.map((c) => c.name) : Array.from({ length: width }, (_, i) => `col${i + 1}`))
    }
    return table
  }

  const addRows = (table: SqlTable, rows: string[][]) => {
    for (const row of rows) {
      table.totalRows++
      if (table.rows.length < MAX_ROWS_PER_TABLE) table.rows.push(row)
    }
  }

  for (const raw of splitStatements(input)) {
    if (raw.startsWith("\u0000COPYDATA\u0000")) {
      const [, , header, block] = raw.split("\u0000")
      const copy = parseCopy(header, block)
      if (copy) {
        const table = ensureTable(copy.table, copy.columns, copy.rows[0]?.length ?? 0)
        addRows(table, copy.rows)
        counts.COPY = (counts.COPY ?? 0) + 1
        statements.push({ kind: "COPY", preview: header.slice(0, 160), table: copy.table })
      }
      continue
    }
    const kind = classify(raw)
    counts[kind] = (counts[kind] ?? 0) + 1
    let tableName: string | undefined
    if (kind === "CREATE TABLE") {
      const created = parseCreateTable(raw)
      if (created) {
        const existing = tables.get(created.name)
        if (existing) {
          existing.columns = created.columns
          if (existing.rowColumns.length === 0) existing.rowColumns = created.rowColumns
        } else tables.set(created.name, created)
        tableName = created.name
      }
    } else if (kind === "INSERT") {
      const insert = parseInsert(raw)
      if (insert) {
        const table = ensureTable(insert.table, insert.columns, insert.rows[0]?.length ?? 0)
        addRows(table, insert.rows)
        tableName = insert.table
      }
    } else {
      const m = /^\w+\s+(?:table\s+)?(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?([\w."`]+)/i.exec(raw)
      if (m && (kind === "ALTER TABLE" || kind === "DROP" || kind === "UPDATE" || kind === "DELETE")) tableName = unquoteIdent(m[1])
    }
    statements.push({ kind, preview: raw.replace(/\s+/g, " ").slice(0, 160), table: tableName })
  }

  return {
    dialect: detectDialect(input),
    tables: Array.from(tables.values()).sort((a, b) => b.totalRows - a.totalRows || a.name.localeCompare(b.name)),
    statements,
    counts,
    truncated,
  }
}

/** Light tokenizer for syntax highlighting in the raw view; returns [className, text] pairs. */
export type SqlToken = ["kw" | "str" | "num" | "cmt" | "id" | "op" | "ws", string]

const KEYWORDS = new Set(
  "select from where insert into values update set delete create table index unique primary key foreign references not null default alter add drop constraint if exists and or in is like between join left right inner outer on as order by group having limit offset copy stdin begin commit rollback with returning cascade restrict owner to grant revoke serial bigserial integer int bigint smallint text varchar char boolean timestamp date time numeric decimal real double precision json jsonb uuid bytea array using btree gin true false type sequence start increment cache no minvalue maxvalue owned comment extension schema function language plpgsql return returns trigger before after each row execute procedure view temp temporary".split(" "),
)

export function tokenizeSql(source: string): SqlToken[] {
  const tokens: SqlToken[] = []
  const re = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.|'')*'|"(?:[^"\\]|\\.)*"|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][\w$]*\b)|(\s+)|([^\s\w'"`]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    if (m[1]) tokens.push(["cmt", m[1]])
    else if (m[2]) tokens.push(["str", m[2]])
    else if (m[3]) tokens.push(["num", m[3]])
    else if (m[4]) tokens.push([KEYWORDS.has(m[4].toLowerCase()) ? "kw" : "id", m[4]])
    else if (m[5]) tokens.push(["ws", m[5]])
    else tokens.push(["op", m[6]])
  }
  return tokens
}
