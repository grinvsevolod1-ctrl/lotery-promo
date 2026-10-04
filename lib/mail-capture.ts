import { AsyncLocalStorage } from "node:async_hooks"

/**
 * Test mail mode (MAIL_TEST_MODE=1): letters are not delivered anywhere.
 * Instead, a letter produced while handling an auth request is captured and
 * returned to the browser as `testMail`, so the verification / reset link can
 * be opened right from the page. Meant for test deployments without a mail
 * provider; never enable it on a public production site.
 */
export const mailTestMode = process.env.MAIL_TEST_MODE === "1"

export type CapturedMail = {
  to: string
  subject: string
  url: string | null
}

const storage = new AsyncLocalStorage<CapturedMail[]>()

export function withMailCapture<T>(run: () => Promise<T>): Promise<T> {
  return storage.run([], run)
}

/** Returns false when no request-scoped capture is active (cron, scripts). */
export function captureMail(mail: CapturedMail): boolean {
  const store = storage.getStore()
  if (!store) return false
  store.push(mail)
  return true
}

export function takeCapturedMail(): CapturedMail[] {
  const store = storage.getStore()
  if (!store) return []
  return store.splice(0)
}

const LINK = /https?:\/\/\S+/

export function firstLink(text: string): string | null {
  return text.match(LINK)?.[0] ?? null
}
