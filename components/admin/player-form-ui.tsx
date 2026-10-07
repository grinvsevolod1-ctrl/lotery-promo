import type { ActionResult } from "@/app/actions/admin-players"

export const fieldClass =
  "h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"

export const labelClass = "flex flex-col gap-1.5 text-sm font-semibold text-foreground"

export function ActionMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null
  return (
    <p role="status" className={state.ok ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-destructive"}>
      {state.ok ? state.message : state.error}
    </p>
  )
}
