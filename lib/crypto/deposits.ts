import "server-only"
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { cryptoInvoice, transaction } from "@/lib/db/schema"
import { isUniqueViolation } from "@/lib/db/ledger"
import { formatByn, notify } from "@/lib/notifications"
import { getSetting, setSetting, SETTING_KEYS } from "@/lib/settings"
import {
  ASSETS,
  ASSET_IDS,
  INVOICE_GRACE_MINUTES,
  INVOICE_TTL_MINUTES,
  MAX_DEPOSIT_BYN,
  MIN_DEPOSIT_BYN,
  baseUnitsFor,
  bynFor,
  chainToUnits,
  fromUnits,
  isAssetId,
  isPlausibleAddress,
  pickTail,
  toUnits,
  type AssetId,
} from "@/lib/crypto/assets"
import { fetchIncoming, type IncomingTransfer } from "@/lib/crypto/chains"
import { getRates } from "@/lib/crypto/rates"

export type Wallets = Partial<Record<AssetId, string>>

export async function getWallets(): Promise<Wallets> {
  const raw = await getSetting(SETTING_KEYS.cryptoWallets)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const wallets: Wallets = {}
    for (const id of ASSET_IDS) {
      const value = parsed[id]
      if (typeof value === "string" && value.trim()) wallets[id] = value.trim()
    }
    return wallets
  } catch {
    return {}
  }
}

export async function saveWallets(input: Record<string, string>): Promise<{ ok: true } | { ok: false; error: string }> {
  const wallets: Wallets = {}
  for (const [key, value] of Object.entries(input)) {
    if (!isAssetId(key)) continue
    const address = value.trim()
    if (!address) continue
    if (!isPlausibleAddress(key, address)) {
      return { ok: false, error: `Адрес для ${ASSETS[key].symbol} (${ASSETS[key].network}) выглядит некорректно` }
    }
    wallets[key] = address
  }
  await setSetting(SETTING_KEYS.cryptoWallets, JSON.stringify(wallets))
  return { ok: true }
}

export async function hasAnyDeposit(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), inArray(transaction.type, ["deposit", "crypto_deposit"])))
    .limit(1)
  return Boolean(row)
}

export type InvoiceView = {
  id: number
  asset: AssetId
  address: string
  cryptoAmount: string
  rate: number
  amountByn: number
  status: string
  txHash: string | null
  createdAt: string
  expiresAt: string
  paidAt: string | null
}

function toView(row: typeof cryptoInvoice.$inferSelect): InvoiceView {
  const asset = row.asset as AssetId
  return {
    id: row.id,
    asset,
    address: row.address,
    cryptoAmount: fromUnits(toUnits(row.cryptoAmount, ASSETS[asset].precision), ASSETS[asset].precision),
    rate: row.rate,
    amountByn: row.amountByn,
    status: row.status,
    txHash: row.txHash,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
  }
}

export async function getUserInvoices(userId: string, limit = 20): Promise<InvoiceView[]> {
  const rows = await db
    .select()
    .from(cryptoInvoice)
    .where(eq(cryptoInvoice.userId, userId))
    .orderBy(desc(cryptoInvoice.createdAt))
    .limit(limit)
  return rows.map(toView)
}

export async function getUserInvoice(userId: string, id: number): Promise<InvoiceView | null> {
  const [row] = await db
    .select()
    .from(cryptoInvoice)
    .where(and(eq(cryptoInvoice.id, id), eq(cryptoInvoice.userId, userId)))
    .limit(1)
  return row ? toView(row) : null
}

export async function getRecentInvoices(limit = 50) {
  return db
    .select()
    .from(cryptoInvoice)
    .orderBy(desc(cryptoInvoice.createdAt))
    .limit(limit)
    .then((rows) => rows.map((row) => ({ ...toView(row), userId: row.userId })))
}

type CreateResult = { ok: true; invoice: InvoiceView } | { ok: false; error: string }

export async function createInvoice(userId: string, asset: AssetId, amountByn: number): Promise<CreateResult> {
  if (!Number.isFinite(amountByn) || amountByn < MIN_DEPOSIT_BYN || amountByn > MAX_DEPOSIT_BYN) {
    return { ok: false, error: `Сумма от ${MIN_DEPOSIT_BYN} до ${MAX_DEPOSIT_BYN.toLocaleString("ru-RU")} BYN` }
  }
  const address = (await getWallets())[asset]
  if (!address) return { ok: false, error: "Этот способ пополнения временно недоступен" }

  const [active] = await db
    .select()
    .from(cryptoInvoice)
    .where(
      and(
        eq(cryptoInvoice.userId, userId),
        eq(cryptoInvoice.status, "pending"),
        sql`${cryptoInvoice.expiresAt} > now()`,
      ),
    )
    .limit(1)
  if (active) return { ok: false, error: "У вас уже есть активная заявка. Оплатите или отмените её." }

  let rateByn: number
  try {
    rateByn = (await getRates()).byn[asset]
  } catch {
    return { ok: false, error: "Не удалось получить курс. Попробуйте через минуту." }
  }

  const { precision } = ASSETS[asset]
  const base = baseUnitsFor(amountByn, rateByn, precision)

  // Two users can race for the same tail; the partial unique index rejects one and we retry.
  for (let attempt = 0; attempt < 5; attempt++) {
    const pending = await db
      .select({ amount: cryptoInvoice.cryptoAmount })
      .from(cryptoInvoice)
      .where(and(eq(cryptoInvoice.asset, asset), eq(cryptoInvoice.status, "pending")))
    const taken = new Set(pending.map((p) => toUnits(p.amount, precision)))
    const units = pickTail(base, taken)
    if (units === null) return { ok: false, error: "Слишком много заявок на эту сумму. Измените сумму на 1 BYN." }

    try {
      const [row] = await db
        .insert(cryptoInvoice)
        .values({
          userId,
          asset,
          address,
          cryptoAmount: fromUnits(units, precision),
          rate: rateByn,
          amountByn: bynFor(units, precision, rateByn),
          expiresAt: new Date(Date.now() + INVOICE_TTL_MINUTES * 60_000),
        })
        .returning()
      return { ok: true, invoice: toView(row) }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  return { ok: false, error: "Не удалось создать заявку, попробуйте ещё раз" }
}

export async function cancelInvoice(userId: string, id: number): Promise<boolean> {
  const rows = await db
    .update(cryptoInvoice)
    .set({ status: "cancelled" })
    .where(and(eq(cryptoInvoice.id, id), eq(cryptoInvoice.userId, userId), eq(cryptoInvoice.status, "pending")))
    .returning({ id: cryptoInvoice.id })
  return rows.length > 0
}

// ─── Blockchain matching ──────────────────────────────────────────────

const FETCH_TTL_MS = 20_000
const transferCache = new Map<string, { at: number; transfers: Promise<IncomingTransfer[]> }>()

/** Explorer APIs are rate limited; polling users and the background scanner share one fetch per wallet. */
function incomingCached(asset: AssetId, address: string): Promise<IncomingTransfer[]> {
  const key = `${asset}:${address}`
  const hit = transferCache.get(key)
  if (hit && Date.now() - hit.at < FETCH_TTL_MS) return hit.transfers
  const transfers = fetchIncoming(asset, address)
  transferCache.set(key, { at: Date.now(), transfers })
  transfers.catch(() => transferCache.delete(key))
  return transfers
}

async function credit(invoice: typeof cryptoInvoice.$inferSelect, txId: string): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const [paid] = await tx
        .update(cryptoInvoice)
        .set({ status: "paid", txHash: txId, paidAt: new Date() })
        .where(and(eq(cryptoInvoice.id, invoice.id), eq(cryptoInvoice.status, "pending")))
        .returning()
      if (!paid) return false
      const info = ASSETS[invoice.asset as AssetId]
      await tx.insert(transaction).values({
        userId: invoice.userId,
        type: "crypto_deposit",
        amount: invoice.amountByn,
        description: `Пополнение ${info.symbol} (${info.network}) #${invoice.id}`,
      })
      await notify(tx, invoice.userId, {
        kind: "money",
        title: `Баланс пополнен на ${formatByn(Number(invoice.amountByn))}`,
        body: `Платёж ${info.symbol} (${info.network}) подтверждён в сети. Загляните в бонусы — за депозит положен подарок.`,
        href: "/cabinet/bonuses",
      })
      return true
    })
  } catch (error) {
    // The same on-chain transfer was already used by another invoice.
    if (isUniqueViolation(error)) return false
    throw error
  }
}

/** Matches pending invoices against confirmed incoming transfers and credits balances. Returns credited count. */
export async function checkPendingInvoices(onlyUserId?: string): Promise<number> {
  const graceMs = INVOICE_GRACE_MINUTES * 60_000
  const conditions = [eq(cryptoInvoice.status, "pending")]
  if (onlyUserId) conditions.push(eq(cryptoInvoice.userId, onlyUserId))
  const pending = await db.select().from(cryptoInvoice).where(and(...conditions))

  const groups = new Map<string, typeof pending>()
  for (const invoice of pending) {
    const key = `${invoice.asset}|${invoice.address}`
    groups.set(key, [...(groups.get(key) ?? []), invoice])
  }

  let credited = 0
  for (const invoices of groups.values()) {
    const asset = invoices[0].asset as AssetId
    if (!isAssetId(asset)) continue
    let transfers: IncomingTransfer[]
    try {
      transfers = await incomingCached(asset, invoices[0].address)
    } catch (error) {
      console.error(JSON.stringify({ level: "warn", event: "crypto_fetch_failed", asset, message: (error as Error).message }))
      continue
    }
    const { precision } = ASSETS[asset]
    for (const invoice of invoices) {
      const expected = toUnits(invoice.cryptoAmount, precision)
      const from = invoice.createdAt.getTime() - 2 * 60_000
      const to = invoice.expiresAt.getTime() + graceMs
      const match = transfers.find(
        (t) =>
          chainToUnits(t.raw, t.decimals, precision) === expected && t.time.getTime() >= from && t.time.getTime() <= to,
      )
      if (match && (await credit(invoice, match.id))) credited++
    }
  }

  await db
    .update(cryptoInvoice)
    .set({ status: "expired" })
    .where(and(eq(cryptoInvoice.status, "pending"), lt(cryptoInvoice.expiresAt, new Date(Date.now() - graceMs))))

  return credited
}
