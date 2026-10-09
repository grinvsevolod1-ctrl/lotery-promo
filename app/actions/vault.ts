"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { allowUserAction } from "@/lib/rate-limit"
import { clearVaultSession, isVaultConfigured, isVaultUnlocked, setVaultSession, verifyVaultPassword } from "@/lib/vault-auth"
import { deleteVaultFile } from "@/lib/vault-files"

type Result = { ok: true } | { ok: false; error: string }

async function clientKey() {
  const h = await headers()
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown"
}

export async function vaultLogin(password: string): Promise<Result> {
  if (!isVaultConfigured()) return { ok: false, error: "Хранилище не настроено: задайте VAULT_SECRET." }
  const allowed = await allowUserAction(`ip:${await clientKey()}`, "vault-login")
  if (!allowed) return { ok: false, error: "Слишком много попыток. Подождите несколько минут." }
  if (typeof password !== "string" || password.length === 0 || password.length > 200) return { ok: false, error: "Введите пароль." }
  if (!(await verifyVaultPassword(password))) return { ok: false, error: "Неверный пароль." }
  await setVaultSession()
  return { ok: true }
}

export async function vaultLogout(): Promise<Result> {
  await clearVaultSession()
  return { ok: true }
}

export async function vaultDeleteFile(id: number): Promise<Result> {
  if (!(await isVaultUnlocked())) return { ok: false, error: "Сессия истекла." }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Файл не найден." }
  const deleted = await deleteVaultFile(id)
  if (!deleted) return { ok: false, error: "Файл не найден." }
  revalidatePath("/vault")
  return { ok: true }
}
