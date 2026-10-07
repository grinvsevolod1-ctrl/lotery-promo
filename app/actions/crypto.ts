"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getUserId } from "@/lib/session"
import { isAdmin } from "@/lib/admin-auth"
import { allowUserAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit"
import { isAssetId } from "@/lib/crypto/assets"
import {
  cancelInvoice,
  checkPendingInvoices,
  createInvoice,
  getUserInvoice,
  saveWallets,
  type InvoiceView,
} from "@/lib/crypto/deposits"
import { getRates } from "@/lib/crypto/rates"

export async function createCryptoInvoice(
  asset: string,
  amountByn: number,
): Promise<{ ok: true; invoice: InvoiceView } | { ok: false; error: string }> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: "Войдите в аккаунт" }
  if (!isAssetId(asset)) return { ok: false, error: "Неизвестная валюта" }
  if (!(await allowUserAction(userId, "crypto_invoice"))) return { ok: false, error: RATE_LIMIT_ERROR }
  const amount = Math.round(Number(amountByn) * 100) / 100
  const result = await createInvoice(userId, asset, amount)
  if (result.ok) revalidatePath("/cabinet/deposit/crypto")
  return result
}

/** Polled by the invoice screen: checks the chain for this user's pending invoices, then returns the fresh state. */
export async function pollCryptoInvoice(id: number): Promise<InvoiceView | null> {
  const userId = await getUserId()
  if (!userId || !Number.isInteger(id)) return null
  const before = await getUserInvoice(userId, id)
  if (before?.status === "pending") {
    const credited = await checkPendingInvoices(userId).catch(() => 0)
    if (credited > 0) revalidatePath("/", "layout")
    return getUserInvoice(userId, id)
  }
  return before
}

export async function cancelCryptoInvoice(id: number): Promise<boolean> {
  const userId = await getUserId()
  if (!userId || !Number.isInteger(id)) return false
  const ok = await cancelInvoice(userId, id)
  if (ok) revalidatePath("/cabinet/deposit/crypto")
  return ok
}

export async function getCryptoRates(): Promise<Record<string, number> | null> {
  try {
    return (await getRates()).byn
  } catch {
    return null
  }
}

export async function saveCryptoWallets(input: Record<string, string>): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) redirect("/admin/login")
  const result = await saveWallets(input)
  if (result.ok) revalidatePath("/admin")
  return result
}

export async function adminCheckCrypto(): Promise<number> {
  if (!(await isAdmin())) redirect("/admin/login")
  const credited = await checkPendingInvoices()
  revalidatePath("/admin")
  return credited
}
