"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useLiveEvents, type LiveScope } from "@/components/use-live-events"

const EVENT_DEBOUNCE_MS = 250

/**
 * Re-renders the current route's server components so server-rendered data stays fresh.
 * With `liveScope` it refreshes the moment a matching server event arrives; `intervalMs`
 * stays as a safety net (and as the only trigger without `liveScope`). The tab regaining
 * focus also refreshes. Client state is preserved by router.refresh(). Paused while hidden.
 */
export function AutoRefresh({
  intervalMs,
  liveScope = null,
  liveTopics = [],
}: {
  intervalMs: number
  liveScope?: LiveScope | null
  liveTopics?: string[]
}) {
  const router = useRouter()
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(() => {
    if (document.visibilityState === "visible") router.refresh()
  }, [router])

  const refreshSoon = useCallback(() => {
    if (pending.current) clearTimeout(pending.current)
    pending.current = setTimeout(refresh, EVENT_DEBOUNCE_MS)
  }, [refresh])

  useLiveEvents(liveScope, liveTopics, refreshSoon, refresh)

  useEffect(() => {
    const timer = setInterval(refresh, intervalMs)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      clearInterval(timer)
      if (pending.current) clearTimeout(pending.current)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [refresh, intervalMs])

  return null
}
