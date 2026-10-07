import { and, asc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import type { Tx } from "@/lib/db/ledger"
import { transaction } from "@/lib/db/schema"

export const MINIMUM_DEPOSIT_FOR_WITHDRAWAL = 100

const DEPOSIT_TYPES = ["deposit", "crypto_deposit"]
const BONUS_TYPES = ["welcome", "bonus", "spin", "referral"]

type LedgerRow = { type: string; amount: number }

export type WithdrawalEligibility = {
  deposited: number
  bonusRemaining: number
  blockedReason: string | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Walks the ledger in order: every bonus credit adds to the amount that must be
 * wagered, and each ticket purchase made afterwards pays it down. Bets placed
 * before a bonus was received never count towards that bonus.
 */
export function evaluateWithdrawal(rows: LedgerRow[]): WithdrawalEligibility {
  let deposited = 0
  let bonusRemaining = 0
  for (const { type, amount } of rows) {
    if (DEPOSIT_TYPES.includes(type)) deposited += amount
    else if (BONUS_TYPES.includes(type)) bonusRemaining += amount
    else if (type === "purchase") bonusRemaining = Math.max(0, bonusRemaining - Math.abs(amount))
  }
  deposited = round2(deposited)
  bonusRemaining = round2(bonusRemaining)

  let blockedReason: string | null = null
  if (deposited < MINIMUM_DEPOSIT_FOR_WITHDRAWAL) {
    const left = round2(MINIMUM_DEPOSIT_FOR_WITHDRAWAL - deposited)
    blockedReason = `Для вывода пополните баланс суммарно минимум на ${MINIMUM_DEPOSIT_FOR_WITHDRAWAL} BYN. Осталось пополнить: ${left} BYN.`
  } else if (bonusRemaining > 0) {
    blockedReason = `Для вывода сначала отыграйте бонус: осталось сделать ставок на ${bonusRemaining} BYN.`
  }
  return { deposited, bonusRemaining, blockedReason }
}

export async function getWithdrawalEligibility(executor: Tx | typeof db, userId: string): Promise<WithdrawalEligibility> {
  const rows = await executor
    .select({ type: transaction.type, amount: transaction.amount })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), inArray(transaction.type, [...DEPOSIT_TYPES, ...BONUS_TYPES, "purchase"])))
    .orderBy(asc(transaction.createdAt), asc(transaction.id))
  return evaluateWithdrawal(rows.map((row) => ({ type: row.type, amount: Number(row.amount) })))
}
