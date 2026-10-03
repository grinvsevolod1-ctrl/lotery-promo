"use client"

import { useEffect, useRef } from "react"

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
export const TURNSTILE_ENABLED = TURNSTILE_SITE_KEY.length > 0

const SCRIPT_ID = "cf-turnstile-script"
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action?: string
      theme?: "light" | "dark" | "auto"
      language?: string
      callback: (token: string) => void
      "expired-callback"?: () => void
      "error-callback"?: () => void
    },
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

function loadScript(onLoad: () => void) {
  if (window.turnstile) {
    onLoad()
    return
  }
  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (!script) {
    script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }
  script.addEventListener("load", onLoad, { once: true })
}

/**
 * Cloudflare Turnstile challenge. Renders nothing when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured, so the forms keep
 * working without the service; the server skips verification in that case too.
 */
export function Turnstile({ action, onToken }: { action: string; onToken: (token: string | null) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_ENABLED) return
    let widgetId: string | undefined
    let cancelled = false

    loadScript(() => {
      if (cancelled || !container.current || !window.turnstile) return
      widgetId = window.turnstile.render(container.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        theme: "dark",
        language: "ru",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      })
    })

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [action])

  if (!TURNSTILE_ENABLED) return null
  return <div ref={container} className="flex min-h-[65px] justify-center" />
}
