"use client"

import { useEffect, useRef, useState } from "react"
import { Spinner } from "./card-icons"

/**
 * Full-screen iframe for the operator's confirmation page. A cross-origin iframe hides its URL,
 * but every navigation fires `load` — the first load is the page itself, any later one means the
 * page redirected, so the frame collapses and the result is read from the API.
 */
export function CardFrame({
  url,
  requestNo,
  onOpened,
  onFinished,
}: {
  url: string
  requestNo: string | null
  onOpened: () => void
  onFinished: () => void
}) {
  const loads = useRef(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  function handleLoad() {
    loads.current += 1
    if (loads.current === 1) {
      setLoaded(true)
      onOpened()
    } else {
      onFinished()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Подтверждение карты"
      className="fixed inset-0 z-[100] flex flex-col bg-background"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <p className="font-display text-base font-bold">Подтверждение карты</p>
        {requestNo && <p className="font-mono text-xs text-muted-foreground">№ {requestNo}</p>}
      </header>
      <div className="relative min-h-0 flex-1">
        {!loaded && (
          <div role="status" className="absolute inset-0 grid place-items-center">
            <Spinner className="size-7 text-primary" />
            <span className="sr-only">Загружаем страницу</span>
          </div>
        )}
        <iframe
          src={url}
          title="Страница подтверждения карты"
          onLoad={handleLoad}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="payment"
          className="absolute inset-0 size-full border-0 bg-white"
        />
      </div>
    </div>
  )
}
