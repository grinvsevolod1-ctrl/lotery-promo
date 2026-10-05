"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Re-renders the current route's server components on an interval and when the
 * tab regains focus, so server-rendered data (balance, admin queue) stays fresh.
 * Client state is preserved by router.refresh(). Paused while the tab is hidden.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    const timer = setInterval(refresh, intervalMs)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [router, intervalMs])

  return null
}
