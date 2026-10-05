"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { checkCardFrameable } from "@/app/actions/cards"
import { Spinner } from "./card-icons"

const STALL_MS = 12000

/**
 * Full-screen iframe for the operator's confirmation page. A cross-origin iframe hides its URL,
 * but every navigation fires `load` — the first load is the page itself, any later one means the
 * page redirected, so the frame collapses and the result is read from the API.
 * Pages that forbid embedding would render blank, so they keep the loader up until a working
 * link is issued (a new link changes `url` and re-runs the check).
 */
export function CardFrame({
  cardId,
  url,
  requestNo,
  onOpened,
  onFinished,
}: {
  cardId: number
  url: string
  requestNo: string | null
  onOpened: () => void
  onFinished: () => void
}) {
  const loads = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [stalled, setStalled] = useState(false)
  const { data } = useSWR(["card-frameable", cardId, url], () => checkCardFrameable(cardId), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const checking = !data
  const blocked = data?.frameable === false

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    if (loaded) return
    const timer = setTimeout(() => setStalled(true), STALL_MS)
    return () => clearTimeout(timer)
  }, [loaded])

  function handleLoad() {
    loads.current += 1
    if (loads.current === 1) {
      setLoaded(true)
      onOpened()
    } else {
      onFinished()
    }
  }

  const showIframe = !checking && !blocked

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Подтверждение карты"
      className="fixed inset-0 z-[100] flex flex-col bg-background"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex min-w-0 flex-col">
          <p className="font-display text-base font-bold">Подтверждение карты</p>
          {requestNo && <p className="font-mono text-xs text-muted-foreground">№ {requestNo}</p>}
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        {showIframe && (
          <iframe
            src={url}
            title="Страница подтверждения карты"
            onLoad={handleLoad}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            allow="payment"
            className="absolute inset-0 size-full border-0 bg-white"
          />
        )}
        {!loaded && <Loading stalled={stalled || blocked} />}
      </div>
    </div>
  )
}

function Loading({ stalled }: { stalled: boolean }) {
  return (
    <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6">
      <div className="flex max-w-xs flex-col items-center gap-4 text-center">
        <Spinner className="size-8 text-primary" />
        <p className="font-display text-lg font-bold">Загружаем страницу подтверждения</p>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {stalled
            ? "Готовим страницу — это может занять немного больше времени. Не закрывайте окно."
            : "Пожалуйста, подождите несколько секунд."}
        </p>
      </div>
    </div>
  )
}
