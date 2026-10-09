import { describe, expect, it } from "vitest"
import { inspectSql, tokenizeSql } from "@/lib/sql-inspect"

describe("inspectSql", () => {
  it("reads CREATE TABLE columns and INSERT rows", () => {
    const report = inspectSql(`
      -- comment; with semicolon
      CREATE TABLE public."user" (
        id serial PRIMARY KEY,
        email text NOT NULL,
        note varchar(50) DEFAULT 'a;b',
        CONSTRAINT user_email_unique UNIQUE(email)
      );
      INSERT INTO "user" (id, email, note) VALUES (1, 'a@b.c', NULL), (2, 'it''s', 'x;y');
    `)
    expect(report.tables).toHaveLength(1)
    const table = report.tables[0]
    expect(table.name).toBe("user")
    expect(table.columns.map((c) => c.name)).toEqual(["id", "email", "note"])
    expect(table.columns[0].primary).toBe(true)
    expect(table.columns[1].nullable).toBe(false)
    expect(table.totalRows).toBe(2)
    expect(table.rows[0]).toEqual(["1", "a@b.c", "∅"])
    expect(table.rows[1]).toEqual(["2", "it's", "x;y"])
    expect(report.counts["CREATE TABLE"]).toBe(1)
    expect(report.counts.INSERT).toBe(1)
  })

  it("reads pg_dump COPY blocks and detects postgres", () => {
    const report = inspectSql(`SET search_path = public;
COPY public.ticket (id, code) FROM stdin;
1\tA\\tB
2\t\\N
\\.

CREATE INDEX idx ON ticket USING btree (code);`)
    expect(report.dialect).toBe("postgres")
    const table = report.tables.find((t) => t.name === "ticket")!
    expect(table.rowColumns).toEqual(["id", "code"])
    expect(table.rows).toEqual([
      ["1", "A\tB"],
      ["2", "∅"],
    ])
    expect(report.counts["CREATE INDEX"]).toBe(1)
  })

  it("handles dollar-quoted function bodies and mysql backticks", () => {
    const report = inspectSql("CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; END; $$ LANGUAGE plpgsql; INSERT INTO `t` VALUES (1,'x');")
    expect(report.statements).toHaveLength(2)
    expect(report.tables[0].name).toBe("t")
    expect(report.tables[0].rowColumns).toEqual(["col1", "col2"])
  })
})

describe("tokenizeSql", () => {
  it("marks keywords, strings and comments", () => {
    const tokens = tokenizeSql("SELECT 'a' -- c")
    expect(tokens.map((t) => t[0])).toEqual(["kw", "ws", "str", "ws", "cmt"])
  })
})
