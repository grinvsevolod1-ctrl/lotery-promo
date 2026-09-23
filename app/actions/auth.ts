"use server"

import crypto from "node:crypto"
import { redirect } from "next/navigation"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { appUser, authRequest, transaction } from "@/lib/db/schema"
import { createSession, destroySession } from "@/lib/session"
import { normalizePhone, normalizeIdNumber, validateIdNumber } from "@/lib/validation"

// Поток подтверждения: заявитель отправляет номер (и данные для регистрации),
// вводит код, а оператор в админ-панели сверяет введённый код и подтверждает
// либо отклоняет заявку. Система код не генерирует — его сверяет оператор.
const REQUEST_TTL_MS = 30 * 60 * 1000 // 30 минут
const MAX_CODE_ATTEMPTS = 5

export type RegisterData = {
  fullName: string
  phone: string
  idNumber: string
}

export type StartResult = {
  ok: boolean
  error?: string
  requestId?: number
  token?: string
}

export type AuthStatus =
  | "pending"
  | "code_entered"
  | "approved"
  | "done"
  | "expired"
  | "rejected"
  | "not_found"

export type AuthState = { status: AuthStatus }

function newToken(): string {
  return crypto.randomBytes(16).toString("hex")
}

const ACTIVE_STATUSES = ["pending", "code_entered", "approved"]

async function loadRequest(requestId: number, token: string) {
  const rows = await db
    .select()
    .from(authRequest)
    .where(eq(authRequest.id, requestId))
    .limit(1)
  const r = rows[0]
  if (!r || r.clientToken !== token) return null
  return r
}

/** Активная заявка того же номера/назначения — переиспользуем, чтобы не
 *  плодить карточки у оператора при повторном старте. */
async function findActiveRequestId(
  phone: string,
  purpose: "login" | "register",
): Promise<number | null> {
  const rows = await db
    .select({ id: authRequest.id })
    .from(authRequest)
    .where(
      and(
        eq(authRequest.phone, phone),
        eq(authRequest.purpose, purpose),
        inArray(authRequest.status, ACTIVE_STATUSES),
      ),
    )
    .orderBy(desc(authRequest.createdAt))
    .limit(1)
  return rows[0]?.id ?? null
}

export async function startRegister(data: RegisterData): Promise<StartResult> {
  const phone = normalizePhone(data.phone)
  if (!phone) {
    return { ok: false, error: "Введите корректный номер телефона" }
  }
  if (!data.fullName || data.fullName.trim().length < 3) {
    return { ok: false, error: "Укажите имя и фамилию" }
  }
  const idNumber = normalizeIdNumber(data.idNumber)
  if (!validateIdNumber(idNumber)) {
    return { ok: false, error: "Проверьте идентификационный номер" }
  }

  const existing = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.phone, phone))
    .limit(1)
  if (existing[0]) {
    return { ok: false, error: "Этот номер уже зарегистрирован. Войдите в систему." }
  }

  const token = newToken()
  const payload = JSON.stringify({ fullName: data.fullName.trim(), phone, idNumber })

  const activeId = await findActiveRequestId(phone, "register")
  if (activeId) {
    await db
      .update(authRequest)
      .set({
        payload,
        status: "pending",
        clientToken: token,
        enteredCode: null,
        attempts: 0,
        smsSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authRequest.id, activeId))
    return { ok: true, requestId: activeId, token }
  }

  const rows = await db
    .insert(authRequest)
    .values({ phone, purpose: "register", payload, status: "pending", clientToken: token })
    .returning({ id: authRequest.id })
  return { ok: true, requestId: rows[0].id, token }
}

export async function startLogin(phoneRaw: string): Promise<StartResult> {
  const phone = normalizePhone(phoneRaw)
  if (!phone) {
    return { ok: false, error: "Введите корректный номер телефона" }
  }

  const existing = await db
    .select({ id: appUser.id, isBlocked: appUser.isBlocked })
    .from(appUser)
    .where(eq(appUser.phone, phone))
    .limit(1)
  if (!existing[0]) {
    return { ok: false, error: "Пользователь с таким номером не найден. Зарегистрируйтесь." }
  }
  if (existing[0].isBlocked) {
    return { ok: false, error: "Доступ заблокирован. Обратитесь в поддержку." }
  }

  const token = newToken()
  const activeId = await findActiveRequestId(phone, "login")
  if (activeId) {
    await db
      .update(authRequest)
      .set({
        status: "pending",
        clientToken: token,
        enteredCode: null,
        attempts: 0,
        smsSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authRequest.id, activeId))
    return { ok: true, requestId: activeId, token }
  }

  const rows = await db
    .insert(authRequest)
    .values({ phone, purpose: "login", status: "pending", clientToken: token })
    .returning({ id: authRequest.id })
  return { ok: true, requestId: rows[0].id, token }
}

export async function getAuthState(requestId: number, token: string): Promise<AuthState> {
  const r = await loadRequest(requestId, token)
  if (!r) return { status: "not_found" }
  if (r.status === "rejected") return { status: "rejected" }
  if (
    r.status !== "done" &&
    r.status !== "approved" &&
    Date.now() - new Date(r.createdAt).getTime() > REQUEST_TTL_MS
  ) {
    return { status: "expired" }
  }
  return { status: r.status as AuthStatus }
}

export async function submitAuthCode(
  requestId: number,
  token: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await loadRequest(requestId, token)
  if (!r) return { ok: false, error: "Заявка не найдена" }
  if (r.status === "code_entered") return { ok: false, error: "Код уже на проверке" }
  if (r.status !== "pending") {
    return { ok: false, error: "Заявка уже обработана. Начните заново." }
  }
  const clean = (code || "").replace(/\D/g, "").slice(0, 6)
  if (clean.length !== 6) return { ok: false, error: "Введите 6 цифр" }

  if (r.attempts >= MAX_CODE_ATTEMPTS) {
    await db
      .update(authRequest)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(authRequest.id, requestId))
    return { ok: false, error: "Превышено число попыток. Начните заново." }
  }

  await db
    .update(authRequest)
    .set({ enteredCode: clean, status: "code_entered", updatedAt: new Date() })
    .where(eq(authRequest.id, requestId))
  return { ok: true }
}

export async function finalizeAuth(
  requestId: number,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await loadRequest(requestId, token)
  if (!r) return { ok: false, error: "Заявка не найдена" }
  if (r.status !== "approved") return { ok: false, error: "Код ещё не проверен" }

  if (r.purpose === "login") {
    const u = await db
      .select({ id: appUser.id, isBlocked: appUser.isBlocked })
      .from(appUser)
      .where(eq(appUser.phone, r.phone))
      .limit(1)
    if (!u[0]) return { ok: false, error: "Пользователь не найден" }
    if (u[0].isBlocked) return { ok: false, error: "Доступ заблокирован" }
    await db
      .update(authRequest)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(authRequest.id, requestId))
    await createSession(u[0].id)
    return { ok: true }
  }

  // Регистрация
  if (!r.payload) return { ok: false, error: "Данные регистрации не найдены" }
  const data = JSON.parse(r.payload) as RegisterData & { phone: string }

  const existing = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.phone, r.phone))
    .limit(1)

  let userId: string
  if (existing[0]) {
    userId = existing[0].id
  } else {
    userId = crypto.randomUUID()
    await db.insert(appUser).values({
      id: userId,
      phone: r.phone,
      fullName: data.fullName.trim(),
      idNumber: data.idNumber,
    })
    // Приветственный бонус новому игроку.
    await db.insert(transaction).values({
      userId,
      type: "welcome",
      amount: 20,
      description: "Приветственный бонус",
    })
  }

  await db
    .update(authRequest)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(authRequest.id, requestId))
  await createSession(userId)
  return { ok: true }
}

export async function signOutAction(): Promise<void> {
  await destroySession()
  redirect("/")
}
