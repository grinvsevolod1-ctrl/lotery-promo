import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "admin_session"
const MAX_AGE = 60 * 60 * 12 // 12 hours

function secret() {
  const value = process.env.ADMIN_SECRET
  if (!value) throw new Error("ADMIN_SECRET is not set")
  return value
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex")
}

/** The only valid cookie value: a signature of the secret itself, never the secret. */
function expectedToken() {
  return sign("admin")
}

export async function verifyAdminPassword(password: string) {
  const a = Buffer.from(sign(password))
  const b = Buffer.from(sign(secret()))
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function setAdminSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  })
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAdmin() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expectedToken())
  return a.length === b.length && timingSafeEqual(a, b)
}
