import { and, asc, desc, eq, inArray, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { draw, ticket, transaction, user } from "@/lib/db/schema"
import {
  MAX_NUMBER,
  NUMBERS_PER_TICKET,
  countMatches,
  formatNumbers,
  nextDrawAt,
  parseNumbers,
  prizeFor,
  randomNumbers,
} from "@/lib/lottery"
import { secureRng } from "@/lib/random"
import { sendDrawResultsEmail, type ResultTicket } from "@/lib/email"

export type DrawRow = typeof draw.$inferSelect

/** The draw that tickets bought right now take part in (created on demand). */
export async function getOrCreateNextDraw(now = new Date()): Promise<DrawRow> {
  const drawAt = nextDrawAt(now)
  await db.insert(draw).values({ drawAt }).onConflictDoNothing({ target: draw.drawAt })
  const [row] = await db.select().from(draw).where(eq(draw.drawAt, drawAt)).limit(1)
  return row
}

export async function getNextDraw(now = new Date()) {
  const [row] = await db
    .select()
    .from(draw)
    .where(and(eq(draw.status, "scheduled"), lte(draw.drawAt, nextDrawAt(now))))
    .orderBy(asc(draw.drawAt))
    .limit(1)
  return row ?? (await getOrCreateNextDraw(now))
}

export async function getSettledDraws(limit = 30) {
  return db
    .select()
    .from(draw)
    .where(eq(draw.status, "settled"))
    .orderBy(desc(draw.drawAt))
    .limit(limit)
}

type SettledDraw = {
  draw: DrawRow
  winning: number[]
  tickets: Array<typeof ticket.$inferSelect>
}

/**
 * Settles every draw whose time has come. One draw per transaction; the row
 * is locked with FOR UPDATE SKIP LOCKED so concurrent runners (cron, the
 * in-process scheduler, a cabinet request) never settle the same draw twice.
 * Result e-mails are sent only after the transaction has committed.
 */
export async function settleDueDraws(now = new Date()) {
  const settled: SettledDraw[] = []

  for (;;) {
    const result = await db.transaction(async (tx) => {
      const [due] = await tx
        .select()
        .from(draw)
        .where(and(eq(draw.status, "scheduled"), lte(draw.drawAt, now)))
        .orderBy(asc(draw.drawAt))
        .limit(1)
        .for("update", { skipLocked: true })
      if (!due) return null

      const winning = randomNumbers(NUMBERS_PER_TICKET, MAX_NUMBER, secureRng)
      const tickets = await tx.select().from(ticket).where(eq(ticket.drawId, due.id))

      let winnersCount = 0
      let prizeTotal = 0
      const settledTickets: SettledDraw["tickets"] = []

      for (const t of tickets) {
        const matches = countMatches(parseNumbers(t.numbers), winning)
        const prize = prizeFor(matches)
        const status = prize > 0 ? "win" : "lose"

        await tx.update(ticket).set({ status, matches, prize }).where(eq(ticket.id, t.id))

        if (prize > 0) {
          winnersCount += 1
          prizeTotal += prize
          await tx.insert(transaction).values({
            userId: t.userId,
            type: "prize",
            amount: prize,
            description: `Выигрыш по билету «${t.game}» #${t.id}, тираж №${due.id}`,
          })
        }
        settledTickets.push({ ...t, status, matches, prize })
      }

      await tx
        .update(draw)
        .set({
          status: "settled",
          winningNumbers: formatNumbers(winning),
          ticketsCount: tickets.length,
          winnersCount,
          prizeTotal,
          settledAt: new Date(),
        })
        .where(eq(draw.id, due.id))

      return { draw: due, winning, tickets: settledTickets }
    })

    if (!result) break
    settled.push(result)
  }

  for (const item of settled) {
    await notifyDrawResults(item)
  }

  return settled.map((s) => ({ id: s.draw.id, tickets: s.tickets.length }))
}

async function notifyDrawResults({ draw: settledDraw, winning, tickets }: SettledDraw) {
  if (tickets.length === 0) return

  const byUser = new Map<string, ResultTicket[]>()
  for (const t of tickets) {
    const list = byUser.get(t.userId) ?? []
    list.push({ id: t.id, game: t.game, numbers: parseNumbers(t.numbers), matches: t.matches, prize: t.prize })
    byUser.set(t.userId, list)
  }

  const recipients = await db
    .select({ id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified })
    .from(user)
    .where(inArray(user.id, [...byUser.keys()]))

  for (const recipient of recipients) {
    if (!recipient.emailVerified) continue
    try {
      await sendDrawResultsEmail({
        to: recipient.email,
        name: recipient.name,
        drawId: settledDraw.id,
        drawAt: settledDraw.drawAt,
        winning,
        tickets: byUser.get(recipient.id) ?? [],
      })
    } catch (error) {
      // A mail failure must not undo a settled draw; log and continue.
      console.error(`[draws] result e-mail to ${recipient.email} failed:`, error)
    }
  }
}
