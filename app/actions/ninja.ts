"use server"

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { balanceOf, isUniqueViolation, lockUser, type Tx } from "@/lib/db/ledger"
import { ninjaRound, ticket, transaction } from "@/lib/db/schema"
import { getUserId } from "@/lib/session"
import { newSeed, seededRng } from "@/lib/random"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { logActivity } from "@/lib/visitors"
import type { ActionResult } from "@/app/actions/cabinet"
import {
  NINJA_GAME_NAME,
  NINJA_MAX_STAKE,
  NINJA_MIN_STAKE,
  awakeningCost,
  canOpen,
  cashoutNinja,
  createNinjaLayout,
  currentMultiplier,
  formatNinjaMultiplier,
  initialNinjaState,
  isNinjaAwakening,
  isNinjaCell,
  isNinjaStake,
  isNinjaTraps,
  ninjaPayout,
  revealNinjaCell,
  type NinjaEvent,
  type NinjaLayout,
  type NinjaState,
} from "@/lib/games/ninja"

/** What the client sees: progress plus, once the round is over, where the traps were. */
export type NinjaRoundView = {
  id: number
  stake: number
  traps: number
  cost: number
  awakening: number
  state: NinjaState
  payout: number
  trapCells: number[] | null
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

class InsufficientFundsError extends Error {}
class RoundError extends Error {}

function view(row: typeof ninjaRound.$inferSelect): NinjaRoundView {
  const state = row.state as NinjaState
  const layout = row.layout as NinjaLayout
  return {
    id: row.id,
    stake: row.stake,
    traps: row.traps,
    cost: Number(row.cost),
    awakening: row.awakening,
    state,
    payout: Number(row.payout),
    trapCells: state.status === "active" ? null : layout.traps,
  }
}

/** Writes the ticket and the prize once a round is over. Runs inside the caller's transaction. */
async function settle(tx: Tx, row: typeof ninjaRound.$inferSelect, state: NinjaState, layout: NinjaLayout) {
  const multiplier = currentMultiplier(state)
  const payout = ninjaPayout(row.stake, multiplier)
  const cost = Number(row.cost)
  const [created] = await tx
    .insert(ticket)
    .values({
      userId: row.userId,
      game: NINJA_GAME_NAME,
      numbers: state.revealed.join(","),
      winningNumbers: layout.traps.join(","),
      cost: Math.round(cost),
      status: payout > cost ? "win" : payout > 0 ? "partial" : "lose",
      matches: state.revealed.length,
      prize: payout,
      seed: row.seed,
      details: {
        kind: "ninja",
        traps: row.traps,
        awakening: row.awakening,
        result: state.status,
        reveals: state.revealed.length,
        rank: state.rank,
        multiplier,
        refund: state.refund,
        revealed: state.revealed,
        sealed: state.sealed,
        sharingan: state.sharingan,
        trapCells: layout.traps,
        bustCell: state.bustCell,
      },
    })
    .returning({ id: ticket.id })

  if (payout > 0) {
    const reason = state.status === "bust" ? `страховка ранга, ${formatNinjaMultiplier(multiplier)}` : formatNinjaMultiplier(multiplier)
    await tx.insert(transaction).values({
      userId: row.userId,
      type: "prize",
      amount: payout,
      description: `Выигрыш: ${NINJA_GAME_NAME} #${created.id}, ${reason}`,
    })
  }

  const [updated] = await tx
    .update(ninjaRound)
    .set({ state, status: state.status, payout, ticketId: created.id, settledAt: new Date() })
    .where(eq(ninjaRound.id, row.id))
    .returning()
  return { updated, payout }
}

async function activeRound(tx: Tx | typeof db, userId: string) {
  const [row] = await tx
    .select()
    .from(ninjaRound)
    .where(and(eq(ninjaRound.userId, userId), eq(ninjaRound.status, "active")))
    .limit(1)
  return row ?? null
}

/** The unfinished round of the player, so a reload or a new device picks up where they stopped. */
export async function getActiveNinjaRound(): Promise<NinjaRoundView | null> {
  const row = await activeRound(db, await getUserId())
  return row ? view(row) : null
}

export type NinjaStartResult = ActionResult<{ round: NinjaRoundView; balance: number; preRevealed: number[] }>

export async function startNinjaRound(stake: number, traps: number, awakening: number): Promise<NinjaStartResult> {
  const userId = await getUserId()
  if (!isNinjaStake(stake)) return { ok: false, error: `Ставка — целое число от ${NINJA_MIN_STAKE} до ${NINJA_MAX_STAKE} BYN` }
  if (!isNinjaTraps(traps) || !isNinjaAwakening(awakening)) return { ok: false, error: "Неверные настройки игры" }
  if (!(await allowUserAction(userId, "ninja"))) return { ok: false, error: RATE_LIMIT_ERROR }

  const cost = awakeningCost(stake, traps, awakening)
  try {
    const result = await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      if (await activeRound(tx, userId)) throw new RoundError("У вас уже есть незавершённый раунд")
      const before = await balanceOf(tx, userId)
      if (before < cost) throw new InsufficientFundsError()

      const seed = newSeed()
      const { layout, preRevealed } = createNinjaLayout(traps, seededRng(seed), awakening)
      let state = initialNinjaState(traps)
      for (const cell of preRevealed) state = revealNinjaCell(state, layout, cell).state

      const [row] = await tx
        .insert(ninjaRound)
        .values({ userId, stake, traps, cost, awakening, seed, layout, state })
        .returning()
      await tx.insert(transaction).values({
        userId,
        type: "purchase",
        amount: -cost,
        description: awakening > 0 ? `${NINJA_GAME_NAME} (Пробуждение), раунд #${row.id}` : `${NINJA_GAME_NAME}, раунд #${row.id}`,
      })
      return { round: view(row), balance: roundMoney(before - cost), preRevealed }
    })
    await logActivity("game", `${NINJA_GAME_NAME}: ставка ${cost} BYN, ловушек ${traps}`)
    return { ok: true, ...result }
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно средств на балансе" }
    if (e instanceof RoundError) return { ok: false, error: e.message }
    if (isUniqueViolation(e)) return { ok: false, error: "У вас уже есть незавершённый раунд" }
    throw e
  }
}

export type NinjaMoveResult = ActionResult<{ round: NinjaRoundView; event: NinjaEvent | null; balance: number | null }>

export async function openNinjaScroll(roundId: number, cell: number): Promise<NinjaMoveResult> {
  const userId = await getUserId()
  if (!Number.isInteger(roundId) || !isNinjaCell(cell)) return { ok: false, error: "Неверный ход" }
  if (!(await allowUserAction(userId, "ninja"))) return { ok: false, error: RATE_LIMIT_ERROR }

  try {
    const result = await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      const row = await activeRound(tx, userId)
      if (!row || row.id !== roundId) throw new RoundError("Раунд не найден или уже завершён")
      const layout = row.layout as NinjaLayout
      const state = row.state as NinjaState
      if (!canOpen(state, cell)) throw new RoundError("Этот свиток уже открыт")

      const { state: next, event } = revealNinjaCell(state, layout, cell)
      if (next.status === "active") {
        const [updated] = await tx.update(ninjaRound).set({ state: next }).where(eq(ninjaRound.id, row.id)).returning()
        return { round: view(updated), event, balance: null as number | null, payout: 0 }
      }
      const { updated, payout } = await settle(tx, row, next, layout)
      return { round: view(updated), event, balance: await balanceOf(tx, userId), payout }
    })
    if (result.round.state.status !== "active") {
      await logActivity("game", `${NINJA_GAME_NAME}: ${result.round.state.status}, выигрыш ${result.payout} BYN`)
    }
    return { ok: true, round: result.round, event: result.event, balance: result.balance }
  } catch (e) {
    if (e instanceof RoundError) return { ok: false, error: e.message }
    throw e
  }
}

export async function collectNinjaRound(roundId: number): Promise<NinjaMoveResult> {
  const userId = await getUserId()
  if (!Number.isInteger(roundId)) return { ok: false, error: "Неверный раунд" }
  if (!(await allowUserAction(userId, "ninja"))) return { ok: false, error: RATE_LIMIT_ERROR }

  try {
    const result = await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      const row = await activeRound(tx, userId)
      if (!row || row.id !== roundId) throw new RoundError("Раунд не найден или уже завершён")
      const state = row.state as NinjaState
      if (state.revealed.length === 0) throw new RoundError("Откройте хотя бы один свиток")
      const { updated, payout } = await settle(tx, row, cashoutNinja(state), row.layout as NinjaLayout)
      return { round: view(updated), balance: await balanceOf(tx, userId), payout }
    })
    await logActivity("game", `${NINJA_GAME_NAME}: забрал ${result.payout} BYN`)
    return { ok: true, round: result.round, event: null, balance: result.balance }
  } catch (e) {
    if (e instanceof RoundError) return { ok: false, error: e.message }
    throw e
  }
}

export type NinjaAutoResult = ActionResult<{ round: NinjaRoundView; events: NinjaEvent[]; balance: number }>

/**
 * Auto mode: one request plays a whole round — start, open `picks` in order
 * (stopping on a trap), collect. The client replays the events as animation.
 */
export async function playNinjaAuto(stake: number, traps: number, picks: number[]): Promise<NinjaAutoResult> {
  const userId = await getUserId()
  if (!isNinjaStake(stake)) return { ok: false, error: `Ставка — целое число от ${NINJA_MIN_STAKE} до ${NINJA_MAX_STAKE} BYN` }
  if (!isNinjaTraps(traps)) return { ok: false, error: "Неверные настройки игры" }
  if (!Array.isArray(picks) || picks.length === 0 || picks.length > 25 || !picks.every(isNinjaCell) || new Set(picks).size !== picks.length) {
    return { ok: false, error: "Выберите свитки для авто-режима" }
  }
  if (!(await allowUserAction(userId, "ninja"))) return { ok: false, error: RATE_LIMIT_ERROR }

  try {
    const result = await db.transaction(async (tx) => {
      await lockUser(tx, userId)
      if (await activeRound(tx, userId)) throw new RoundError("Сначала завершите текущий раунд")
      const before = await balanceOf(tx, userId)
      if (before < stake) throw new InsufficientFundsError()

      const seed = newSeed()
      const { layout } = createNinjaLayout(traps, seededRng(seed))
      let state = initialNinjaState(traps)
      const events: NinjaEvent[] = []
      for (const cell of picks) {
        if (state.status !== "active") break
        if (!canOpen(state, cell)) continue
        const step = revealNinjaCell(state, layout, cell)
        state = step.state
        events.push(step.event)
      }
      if (state.status === "active") state = cashoutNinja(state)

      const [row] = await tx
        .insert(ninjaRound)
        .values({ userId, stake, traps, cost: stake, awakening: 0, seed, layout, state: initialNinjaState(traps) })
        .returning()
      await tx.insert(transaction).values({ userId, type: "purchase", amount: -stake, description: `${NINJA_GAME_NAME} (авто), раунд #${row.id}` })
      const { updated, payout } = await settle(tx, row, state, layout)
      return { round: view(updated), events, balance: roundMoney(before - stake + payout), payout }
    })
    await logActivity("game", `${NINJA_GAME_NAME} (авто): ставка ${stake} BYN, выигрыш ${result.payout} BYN`)
    return { ok: true, round: result.round, events: result.events, balance: result.balance }
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Недостаточно средств на балансе" }
    if (e instanceof RoundError) return { ok: false, error: e.message }
    throw e
  }
}
