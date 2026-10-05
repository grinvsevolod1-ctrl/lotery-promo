import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { transaction } from "@/lib/db/schema"

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Serialises money operations of one user so parallel requests cannot both pass a balance check. */
export async function lockUser(tx: Tx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
}

export async function balanceOf(executor: Tx | typeof db, userId: string) {
  const [row] = await executor
    .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
    .from(transaction)
    .where(eq(transaction.userId, userId))
  return Number(row?.total ?? 0)
}

/** Postgres unique_violation (23505); drizzle wraps the driver error in `cause`. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; current && depth < 3; depth++) {
    if (typeof current === "object" && (current as { code?: unknown }).code === "23505") return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
