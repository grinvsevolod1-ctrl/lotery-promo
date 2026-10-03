import { settleDueDraws } from "@/lib/draws"

const INTERVAL_MS = 60_000

type SchedulerState = { timer: ReturnType<typeof setInterval>; running: boolean }

const globalState = globalThis as unknown as { __lotterySchedulerState?: SchedulerState }

async function tick() {
  const state = globalState.__lotterySchedulerState
  if (!state || state.running) return
  state.running = true
  try {
    const settled = await settleDueDraws()
    if (settled.length > 0) {
      console.log(`[scheduler] settled draws: ${settled.map((d) => `#${d.id} (${d.tickets} tickets)`).join(", ")}`)
    }
  } catch (error) {
    console.error("[scheduler] settlement failed:", error)
  } finally {
    state.running = false
  }
}

/**
 * Settles due draws every minute inside the Next.js server process, so the
 * VPS needs no external cron. Idempotent across hot reloads and safe to run
 * alongside the /api/cron/settle endpoint thanks to row-level locking.
 */
export function startScheduler() {
  if (globalState.__lotterySchedulerState) return
  const timer = setInterval(tick, INTERVAL_MS)
  // Let the server finish booting before the first database round-trip.
  const kickoff = setTimeout(tick, 5_000)
  timer.unref?.()
  kickoff.unref?.()
  globalState.__lotterySchedulerState = { timer, running: false }
  console.log("[scheduler] draw settlement scheduler started")
}
