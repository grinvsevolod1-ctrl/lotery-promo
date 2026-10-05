import { unstable_isUnrecognizedActionError } from "next/navigation"

export const STALE_PAGE_MESSAGE = "Сайт обновился, перезагружаем страницу…"

// After a redeploy, server action IDs change and a page opened before it can no longer call them.
// Reloading picks up the new build, which is what the user needs instead of a generic error.
export function isStaleDeploymentError(error: unknown): boolean {
  return unstable_isUnrecognizedActionError(error)
}

export function reloadForNewDeployment() {
  if (typeof window === "undefined") return
  const key = "stale-reload-at"
  const last = Number(window.sessionStorage.getItem(key) ?? 0)
  // Guard against a reload loop if the new build is also broken.
  if (Date.now() - last < 10_000) return
  window.sessionStorage.setItem(key, String(Date.now()))
  window.location.reload()
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  if (isStaleDeploymentError(error)) {
    reloadForNewDeployment()
    return STALE_PAGE_MESSAGE
  }
  return fallback
}
