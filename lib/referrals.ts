import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import type { Tx } from "@/lib/db/ledger"
import { referral, referralCode, transaction } from "@/lib/db/schema"
import { REFERRAL_BONUS } from "@/lib/lottery"

export const REFERRAL_COOKIE = "toloto-referral"
export const REFERRAL_TTL = 30 * 24 * 60 * 60

function sign(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("Missing auth secret")
  return createHmac("sha256", secret).update(`referral:${value}`).digest("base64url")
}

export function createReferralCookie(code: string) {
  const value = `${code}.${Math.floor(Date.now() / 1000) + REFERRAL_TTL}`
  return `${value}.${sign(value)}`
}

export function readReferralCookie(value: string): string | null {
  const parts = value.split(".")
  if (parts.length !== 3) return null
  const [code, expires, signature] = parts
  if (!/^[a-f0-9]{24}$/.test(code) || !/^\d{10}$/.test(expires)) return null
  const expiry = Number(expires)
  const now = Math.floor(Date.now() / 1000)
  if (expiry <= now || expiry > now + REFERRAL_TTL) return null
  const expected = Buffer.from(sign(`${code}.${expires}`))
  const actual = Buffer.from(signature)
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? code : null
}

export async function getOrCreateReferralCode(userId: string) {
  await db.insert(referralCode).values({ userId, code: randomBytes(12).toString("hex") }).onConflictDoNothing({ target: referralCode.userId })
  const [row] = await db.select({ code: referralCode.code }).from(referralCode).where(eq(referralCode.userId, userId))
  return row.code
}


/**
 * Credits the inviter once, when the invitee gets a confirmed card. The status
 * flip from "approved" to "rewarded" is the idempotency guard.
 */
export async function rewardReferrer(tx: Tx, inviteeId: string) {
  const [row] = await tx.update(referral).set({ status: "rewarded", processedAt: new Date() })
    .where(and(eq(referral.inviteeId, inviteeId), eq(referral.status, "approved")))
    .returning({ userId: referral.userId })
  if (!row) return
  await tx.insert(transaction).values({
    userId: row.userId,
    type: "referral",
    amount: REFERRAL_BONUS,
    description: "Бонус за приглашённого друга",
  })
}

export async function recordReferral(inviteeId: string, cookieValue: string) {
  const code = readReferralCookie(cookieValue)
  if (!code) return
  const [owner] = await db.select({ userId: referralCode.userId }).from(referralCode).where(eq(referralCode.code, code))
  if (!owner || owner.userId === inviteeId) return
  await db
    .insert(referral)
    .values({ userId: owner.userId, inviteeId, status: "approved", processedAt: new Date() })
    .onConflictDoNothing({ target: referral.inviteeId })
}
