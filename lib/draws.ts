import { and, desc, eq, gt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { ticket, transaction, user } from "@/lib/db/schema"
import { formatNumbers, getGame, parseNumbers, playInstant } from "@/lib/lottery"
import { newSeed, seededRng } from "@/lib/random"

/**
 * Tickets bought before the switch to instant play could still be pending.
 * Settle each one instantly with its own winning combination. Idempotent:
 * rows are locked with SKIP LOCKED and only "pending" tickets are touched.
 */
export async function settleLegacyTickets() {
  let settled = 0
  for (;;) {
    const done = await db.transaction(async (tx) => {
      const [pending] = await tx
        .select()
        .from(ticket)
        .where(eq(ticket.status, "pending"))
        .limit(1)
        .for("update", { skipLocked: true })
      if (!pending) return false

      const game = getGame(pending.game)
      const picked = parseNumbers(pending.numbers)
      if (!game || picked.length !== game.pick) {
        await tx.update(ticket).set({ status: "lose" }).where(eq(ticket.id, pending.id))
        return true
      }

      const seed = newSeed()
      const outcome = playInstant(game, picked, seededRng(seed))
      await tx
        .update(ticket)
        .set({
          seed,
          status: outcome.prize > 0 ? "win" : "lose",
          matches: outcome.matches,
          prize: outcome.prize,
          winningNumbers: formatNumbers(outcome.winning),
        })
        .where(eq(ticket.id, pending.id))
      if (outcome.prize > 0) {
        await tx.insert(transaction).values({
          userId: pending.userId,
          type: "prize",
          amount: outcome.prize,
          description: `Выигрыш: билет «${game.name}» #${pending.id}`,
        })
      }
      return true
    })
    if (!done) break
    settled += 1
  }
  return settled
}

export type RecentWin = { id: number; name: string; game: string; prize: number; matches: number; at: Date }

/** "Алексей Петров" → "Алексей П." so the public feed never shows full names. */
function shortName(name: string) {
  const [first = "Игрок", last] = name.trim().split(/\s+/)
  return last ? `${first} ${last[0].toUpperCase()}.` : first
}

export async function getRecentWins(limit = 30): Promise<RecentWin[]> {
  const rows = await db
    .select({
      id: ticket.id,
      name: user.name,
      game: ticket.game,
      prize: ticket.prize,
      matches: ticket.matches,
      at: ticket.createdAt,
    })
    .from(ticket)
    .innerJoin(user, eq(user.id, ticket.userId))
    .where(and(eq(ticket.status, "win"), gt(ticket.prize, 0)))
    .orderBy(desc(ticket.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, name: shortName(r.name) }))
}

export async function getWinStats() {
  const [row] = await db
    .select({
      tickets: sql<number>`count(*)`,
      wins: sql<number>`count(*) filter (where ${ticket.status} = 'win')`,
      paid: sql<number>`coalesce(sum(${ticket.prize}), 0)`,
    })
    .from(ticket)
  return { tickets: Number(row?.tickets ?? 0), wins: Number(row?.wins ?? 0), paid: Number(row?.paid ?? 0) }
}
