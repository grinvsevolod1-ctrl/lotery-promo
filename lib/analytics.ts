/**
 * Funnel goals stored in our own activity log (visitor_event, type "funnel").
 * The admin funnel page counts unique devices per step.
 */
export const GOALS = [
  "promo_view",
  "promo_signup_click",
  "promo_dismiss",
  "banner_click",
  "guest_game_click",
  "header_signup_click",
  "signup_view",
  "signup_success",
  "signin_success",
  "deposit_view",
  "deposit_request",
  "crypto_invoice",
  "withdraw_request",
  "game_open",
] as const

export type Goal = (typeof GOALS)[number]

type Params = Record<string, string | number | boolean>

export function isGoal(value: unknown): value is Goal {
  return typeof value === "string" && (GOALS as readonly string[]).includes(value)
}

export function track(goal: Goal, params?: Params) {
  if (typeof window === "undefined") return
  try {
    const body = JSON.stringify({ goal, params, path: window.location.pathname })
    const sent = navigator.sendBeacon?.("/api/visit/event", new Blob([body], { type: "application/json" }))
    if (!sent) void fetch("/api/visit/event", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } })
  } catch {}
}
