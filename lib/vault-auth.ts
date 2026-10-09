import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "vault_session"
const MAX_AGE = 60 * 60 * 8

/** The vault has its own password (VAULT_SECRET), independent from the admin panel. */
function secret() {
  const value = process.env.VAULT_SECRET
  if (!value) throw new Error("VAULT_SECRET is not set")
  return value
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex")
}

function expectedToken() {
  return sign("vault")
}

function equal(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isVaultConfigured() {
  return Boolean(process.env.VAULT_SECRET)
}

export async function verifyVaultPassword(password: string) {
  return equal(sign(password), sign(secret()))
}

export async function setVaultSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, expectedToken(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE })
}

export async function clearVaultSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isVaultUnlocked() {
  if (!isVaultConfigured()) return false
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return Boolean(token) && equal(token!, expectedToken())
}
