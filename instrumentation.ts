export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Set DISABLE_INTERNAL_SCHEDULER=1 when an external cron calls /api/cron/settle.
  if (process.env.DISABLE_INTERNAL_SCHEDULER === "1") return

  const { startScheduler } = await import("@/lib/scheduler")
  startScheduler()
}
