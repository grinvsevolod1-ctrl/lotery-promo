import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { fundingRequest, paymentCard, user } from "@/lib/db/schema"
import { sendFundingEmail, type FundingMailKind } from "@/lib/email"
import { ASSETS, isAssetId } from "@/lib/crypto/assets"

function describeMethod(card: string | null, asset: string | null) {
  if (asset && isAssetId(asset)) return `${ASSETS[asset].symbol} (${ASSETS[asset].network})`
  if (card) return `Карта •••• ${card}`
  return null
}

/** A failed letter must never break the money flow, so errors are only logged. */
async function safeSend(input: Parameters<typeof sendFundingEmail>[0]) {
  try {
    await sendFundingEmail(input)
  } catch (error) {
    console.error(`[mail] funding letter "${input.kind}" for request ${input.id} failed:`, error)
  }
}

/**
 * Sends the letter for a card/crypto funding request. `stage` is what just
 * happened; the deposit/withdrawal flavour is read from the request itself.
 */
export async function mailFundingRequest(requestId: number, stage: "requested" | "approved" | "rejected", reason?: string | null) {
  const [row] = await db
    .select({
      type: fundingRequest.type,
      amount: fundingRequest.amount,
      asset: fundingRequest.asset,
      last4: paymentCard.last4,
      email: user.email,
      name: user.name,
    })
    .from(fundingRequest)
    .innerJoin(user, eq(user.id, fundingRequest.userId))
    .leftJoin(paymentCard, eq(paymentCard.id, fundingRequest.cardId))
    .where(eq(fundingRequest.id, requestId))
    .limit(1)
  if (!row || !row.email) return

  const kind = `${row.type === "deposit" ? "deposit" : "withdrawal"}_${stage}` as FundingMailKind
  await safeSend({
    to: row.email,
    name: row.name,
    kind,
    id: requestId,
    amount: Number(row.amount),
    method: describeMethod(row.last4, row.asset),
    reason: stage === "rejected" ? reason : null,
  })
}

/** Letter for an automatically confirmed crypto deposit (no funding request behind it). */
export async function mailCryptoDeposit(input: { userId: string; invoiceId: number; amount: number; asset: string }) {
  const [row] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, input.userId)).limit(1)
  if (!row || !row.email) return
  await safeSend({
    to: row.email,
    name: row.name,
    kind: "deposit_approved",
    id: input.invoiceId,
    amount: input.amount,
    method: describeMethod(null, input.asset),
  })
}
