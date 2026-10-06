/**
 * Funnel goals sent to Yandex Metrika (reachGoal) and Umami (track).
 * Configure the same goal identifiers in Metrika as "JavaScript event" goals
 * to build the funnel: landing → promo → signup_view → signup_success → deposit_view → deposit_request.
 */
export type Goal =
  | "promo_view"
  | "promo_signup_click"
  | "promo_dismiss"
  | "banner_click"
  | "guest_game_click"
  | "header_signup_click"
  | "signup_view"
  | "signup_success"
  | "signin_success"
  | "deposit_view"
  | "deposit_request"
  | "crypto_invoice"
  | "withdraw_request"
  | "game_open"

type Params = Record<string, string | number | boolean>

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void
    umami?: { track: (event: string, data?: Params) => void }
  }
}

export const METRIKA_ID = Number(process.env.NEXT_PUBLIC_YM_ID) || 0

export function track(goal: Goal, params?: Params) {
  if (typeof window === "undefined") return
  try {
    if (METRIKA_ID && window.ym) window.ym(METRIKA_ID, "reachGoal", goal, params)
    window.umami?.track(goal, params)
  } catch {}
}
