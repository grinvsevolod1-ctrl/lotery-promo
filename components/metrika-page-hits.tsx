"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { METRIKA_ID } from "@/lib/analytics"

/** Metrika is initialised with defer:true, so every client-side navigation (including the first) sends its own hit. */
export function MetrikaPageHits() {
  const pathname = usePathname()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    const url = window.location.pathname + window.location.search
    const send = () => window.ym?.(METRIKA_ID, "hit", url, { referer: previous.current ?? document.referrer })
    if (window.ym) send()
    else window.setTimeout(send, 800)
    previous.current = window.location.href
  }, [pathname])

  return null
}
