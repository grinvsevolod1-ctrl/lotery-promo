"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** Reports each page view to /api/visit. Admin pages are never reported. */
export function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith("/admin")) return
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
