import "server-only"
import { randomInt } from "node:crypto"
import { and, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { user, userVerification } from "@/lib/db/schema"
import { publish, topics } from "@/lib/realtime"
import { escapeTelegram, sendTelegramButtons } from "@/lib/telegram"
import { notifySafe } from "@/lib/notifications"
import { NO_MSI_TEXT, stageTitle } from "@/lib/verification"

/**
 * Verification lifecycle:
 *   code        → the player must enter the 6-digit code
 *   code_review → the code was entered, an operator confirms it in Telegram
 *   pending     → the code is confirmed, the operator either requests an extra check (→ code) or finishes
 *   approved / rejected
 */
export type VerificationDecision = "codeok" | "codebad" | "nomsi" | "extra" | "approve" | "reject"

/** No SMS gateway yet: while testing, the code is shown to the player on screen. Set VERIFICATION_SHOW_CODE=0 to hide it. */
export const SHOW_TEST_CODE = process.env.VERIFICATION_SHOW_CODE !== "0"

export function newVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

const FROM_STATUS: Record<VerificationDecision, string[]> = {
  codeok: ["code_review"],
  codebad: ["code_review"],
  nomsi: ["code_review"],
  extra: ["pending", "code_review"],
  approve: ["pending"],
  reject: ["code", "code_review", "pending"],
}

const DECISION_FEEDBACK: Record<VerificationDecision, string> = {
  codeok: "Код подтверждён. Выберите следующий шаг в новом сообщении.",
  codebad: "Код отклонён. Игроку выдан новый код.",
  nomsi: "Игроку показано: номера нет в МСИ, нужно обратиться в банк или ЕРИП.",
  extra: "Запрошена дополнительная проверка. Игроку выдан новый код.",
  approve: "Верификация завершена: личность подтверждена.",
  reject: "Верификация отклонена.",
}

async function loadWithUser(id: number) {
  const [row] = await db
    .select({ v: userVerification, name: user.name, email: user.email })
    .from(userVerification)
    .innerJoin(user, eq(user.id, userVerification.userId))
    .where(eq(userVerification.id, id))
    .limit(1)
  return row ?? null
}

function playerLine(name: string, email: string) {
  return `Игрок: ${escapeTelegram(name)} (${escapeTelegram(email)})`
}

export async function announceCode(id: number) {
  const row = await loadWithUser(id)
  if (!row?.v.code) return
  await sendTelegramButtons(
    [
      `<b>${escapeTelegram(stageTitle(row.v.stage))}</b> · заявка #${row.v.id}`,
      playerLine(row.name, row.email),
      `Телефон: ${escapeTelegram(row.v.phone)}`,
      `Выдан код: <code>${row.v.code}</code>`,
      "Ждём, когда игрок введёт код.",
    ].join("\n"),
    { kind: "verification", id },
    [{ text: "Отклонить верификацию", decision: "reject" }],
  )
}

export async function announceEnteredCode(id: number) {
  const row = await loadWithUser(id)
  if (!row) return
  const matches = row.v.enteredCode === row.v.code
  await sendTelegramButtons(
    [
      `<b>Игрок ввёл код</b> · заявка #${row.v.id}`,
      playerLine(row.name, row.email),
      `Этап: ${escapeTelegram(stageTitle(row.v.stage))}`,
      `Введён: <code>${escapeTelegram(row.v.enteredCode ?? "")}</code>`,
      `Выдан: <code>${row.v.code ?? "—"}</code>`,
      matches ? "Коды совпадают." : "Коды НЕ совпадают.",
    ].join("\n"),
    { kind: "verification", id },
    [
      { text: "Код верный", decision: "codeok" },
      { text: "Код неверный", decision: "codebad" },
      { text: "Нет номера в МСИ", decision: "nomsi" },
    ],
  )
}

async function askNextStep(id: number) {
  const row = await loadWithUser(id)
  if (!row) return
  await sendTelegramButtons(
    [
      `<b>Код подтверждён</b> · заявка #${row.v.id}`,
      playerLine(row.name, row.email),
      `Пройдено проверок: ${row.v.stage + 1}`,
      "Игрок видит «Ожидание проверки». Что дальше?",
    ].join("\n"),
    { kind: "verification", id },
    [
      { text: "Доп. проверка", decision: "extra" },
      { text: "Завершить верификацию", decision: "approve" },
      { text: "Отклонить", decision: "reject" },
    ],
  )
}

async function afterChange(userId: string) {
  revalidatePath("/cabinet", "layout")
  revalidatePath("/admin/verification")
  await Promise.all([publish(topics.adminVerification), publish(topics.adminCounts), publish(topics.userVerification(userId))])
}

/** Applies an operator decision; returns false when the application is no longer at a stage the decision applies to. */
export async function decideVerification(id: number, decision: VerificationDecision, note: string | null = null) {
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return false
  const now = new Date()
  const set =
    decision === "codeok"
      ? { status: "pending" }
      : decision === "codebad"
        ? { status: "code", code: newVerificationCode(), enteredCode: null, codeSentAt: now }
        : decision === "nomsi"
          ? { status: "no_msi", code: null, enteredCode: null, note: null, reviewedAt: now }
        : decision === "extra"
          ? { status: "code", code: newVerificationCode(), enteredCode: null, codeSentAt: now, stage: sql`${userVerification.stage} + 1` }
          : decision === "approve"
            ? { status: "approved", code: null, enteredCode: null, note: null, reviewedAt: now }
            : { status: "rejected", code: null, enteredCode: null, note, reviewedAt: now }

  const [row] = await db
    .update(userVerification)
    .set(set)
    .where(and(eq(userVerification.id, id), inArray(userVerification.status, FROM_STATUS[decision])))
    .returning({ userId: userVerification.userId })
  if (!row) return false

  await afterChange(row.userId)
  if (decision === "codeok") await askNextStep(id)
  if (decision === "codebad" || decision === "extra") await announceCode(id)

  const message =
    decision === "codebad"
      ? { title: "Код не подтверждён", body: "Введите новый код подтверждения в разделе верификации." }
      : decision === "nomsi"
        ? { title: "Номер не найден в МСИ", body: NO_MSI_TEXT }
      : decision === "extra"
        ? { title: "Дополнительная проверка", body: "Подтвердите номер телефона: введите новый код в разделе верификации." }
        : decision === "approve"
          ? { title: "Личность подтверждена", body: "Ваши данные проверены. Теперь вам доступны все возможности аккаунта." }
          : decision === "reject"
            ? { title: "Верификация отклонена", body: note ?? "Проверьте данные и отправьте заявку повторно." }
            : null
  if (message) await notifySafe(row.userId, { kind: "system", ...message, href: "/cabinet/verification" })
  return true
}

export function verificationFeedback(decision: VerificationDecision) {
  return DECISION_FEEDBACK[decision]
}

export function isVerificationDecision(value: string): value is VerificationDecision {
  return value in FROM_STATUS
}
