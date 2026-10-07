"use server"

import { verificationBlock } from "@/lib/verification-gate"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { balanceOf, lockUser } from "@/lib/db/ledger"
import { ticket, transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { newSeed, seededRng } from "@/lib/random"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import type { Rng } from "@/lib/lottery"
import {
  PLINKO_GAME_NAME,
  PLINKO_MAX_STAKE,
  PLINKO_MIN_STAKE,
  formatMultiplier,
  isPlinkoRisk,
  isPlinkoRows,
  playPlinko,
  type PlinkoRisk,
} from "@/lib/games/plinko"
import { SCRATCH_GAME_NAME, isScratchPrice, playScratch, type ScratchSymbol } from "@/lib/games/scratch"
import type { ActionResult } from "@/app/actions/cabinet"
import { logActivity } from "@/lib/visitors"

class InsufficientFundsError extends Error {}

type Round = {
  numbers: string
  winningNumbers: string | null
  matches: number
  prize: number
  details: Record<string, unknown>
  prizeDescription: string
}

/**
 * Charges `cost`, plays the round with a seeded CSPRNG stream and pays the
 * prize in one locked transaction, recording the seed for audits.
 */
async function settleRound<T>(
  userId: string,
  game: string,
  cost: number,
  play: (rng: Rng) => { round: Round; result: T },
  { revalidate = true }: { revalidate?: boolean } = {},
): Promise<ActionResult<T & { ticketId: number; balance: number }>> {
  let prizePaid = 0
  try {
    const settled = await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      const before = await balanceOf(tx, userId)
      if (before < cost) throw new InsufficientFundsError()

      const seed = newSeed()
      const { round, result } = play(seededRng(seed))
      const [created] = await tx
        .insert(ticket)
        .values({
          userId,
          game,
          numbers: round.numbers,
          winningNumbers: round.winningNumbers,
          cost,
          status: round.prize > cost ? "win" : round.prize > 0 ? "partial" : "lose",
          matches: round.matches,
          prize: round.prize,
          seed,
          details: round.details,
        })
        .returning({ id: ticket.id })

      await tx.insert(transaction).values({ userId, type: "purchase", amount: -cost, description: `${game} #${created.id}` })
      if (round.prize > 0) {
        await tx.insert(transaction).values({
          userId,
          type: "prize",
          amount: round.prize,
          description: `Выигрыш: ${game} #${created.id}, ${round.prizeDescription}`,
        })
      }
      prizePaid = round.prize
      return { ...result, ticketId: created.id, balance: Math.round((before - cost + round.prize) * 100) / 100 }
    })
    await logActivity("game", `${game}: ставка ${cost} BYN, выигрыш ${prizePaid} BYN`)
    // Rapid-fire games (Plinko) skip this: re-rendering the whole /play layout on every
    // ball serialises server actions and freezes the board; the client refreshes once instead.
    if (revalidate) {
      revalidatePath("/cabinet")
      revalidatePath("/play", "layout")
    }
    return { ok: true, ...settled }
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно средств на балансе" }
    throw e
  }
}

export type PlinkoResult = { path: number[]; slot: number; multiplier: number; payout: number }

export async function dropPlinkoBall(stake: number, rows: number, risk: PlinkoRisk) {
  const userId = await getUserId()
  if (!Number.isInteger(stake) || stake < PLINKO_MIN_STAKE || stake > PLINKO_MAX_STAKE) {
    return { ok: false, error: `Ставка — целое число от ${PLINKO_MIN_STAKE} до ${PLINKO_MAX_STAKE} BYN` } as const
  }
  if (!isPlinkoRows(rows) || !isPlinkoRisk(risk)) return { ok: false, error: "Неверные настройки игры" } as const
  if (!(await allowUserAction(userId, "plinko"))) return { ok: false, error: RATE_LIMIT_ERROR } as const
  const unverified = await verificationBlock(userId)
  if (unverified) return { ok: false, error: unverified } as const

  return settleRound<PlinkoResult>(userId, PLINKO_GAME_NAME, stake, (rng) => {
    const out = playPlinko(stake, rows, risk, rng)
    return {
      result: out,
      round: {
        numbers: out.path.join(""),
        winningNumbers: String(out.slot),
        matches: out.slot,
        prize: out.payout,
        details: { kind: "plinko", rows, risk, path: out.path, slot: out.slot, multiplier: out.multiplier },
        prizeDescription: formatMultiplier(out.multiplier),
      },
    }
  }, { revalidate: false })
}

export type ScratchResult = {
  fields: ScratchSymbol[]
  matches: number
  winningSymbol: ScratchSymbol | null
  multiplier: number
  prize: number
}

export async function buyScratchCard(price: number) {
  const userId = await getUserId()
  if (!isScratchPrice(price)) return { ok: false, error: "Неверная цена билета" } as const
  if (!(await allowUserAction(userId, "scratch"))) return { ok: false, error: RATE_LIMIT_ERROR } as const
  const unverified = await verificationBlock(userId)
  if (unverified) return { ok: false, error: unverified } as const

  return settleRound<ScratchResult>(userId, SCRATCH_GAME_NAME, price, (rng) => {
    const out = playScratch(price, rng)
    return {
      result: out,
      round: {
        numbers: out.fields.join(","),
        winningNumbers: out.winningSymbol,
        matches: out.matches,
        prize: out.prize,
        details: { kind: "scratch", price, ...out },
        prizeDescription: `${out.matches} одинаковых, x${out.multiplier}`,
      },
    }
  })
}
