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
 * Pages that forbid embedding render blank, so they are detected up front and opened in a new tab.
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
  const [openedInTab, setOpenedInTab] = useState(false)
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
    if (checking || blocked || loaded) return
    const timer = setTimeout(() => setStalled(true), STALL_MS)
    return () => clearTimeout(timer)
  }, [checking, blocked, loaded])

  function handleLoad() {
    loads.current += 1
    if (loads.current === 1) {
      setLoaded(true)
      onOpened()
    } else {
      onFinished()
    }
  }

  function openInTab() {
    window.open(url, "_blank", "noopener")
    if (!openedInTab) {
      setOpenedInTab(true)
      onOpened()
    }
  }

  const showFallback = blocked || stalled

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Подтверждение карты"
      className="fixed inset-0 z-[100] flex flex-col bg-background"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex min-w-0 flex-col">
          <p className="font-display text-base font-bold">Подтверждение карты</p>
          {requestNo && <p className="font-mono text-xs text-muted-foreground">№ {requestNo}</p>}
        </div>
        {!checking && !blocked && (
          <button
            type="button"
            onClick={openInTab}
            className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/10"
          >
            Открыть в новой вкладке
          </button>
        )}
      </header>
      <div className="relative min-h-0 flex-1">
        {checking && <Loading />}

        {!checking && !blocked && (
          <>
            {!loaded && !stalled && <Loading />}
            <iframe
              src={url}
              title="Страница подтверждения карты"
              onLoad={handleLoad}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              allow="payment"
              className="absolute inset-0 size-full border-0 bg-white"
            />
          </>
        )}

        {showFallback && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-5">
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
              {openedInTab ? (
                <>
                  <Spinner className="size-7 text-primary" />
                  <p className="font-display text-lg font-bold">Ждём подтверждения</p>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    Завершите подтверждение в открывшейся вкладке. Результат появится здесь автоматически.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-bold">Откройте страницу подтверждения</p>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    Страница банка открывается в отдельной вкладке. После подтверждения вернитесь сюда — результат появится автоматически.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={openInTab}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {openedInTab ? "Открыть ещё раз" : "Открыть страницу"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div role="status" className="absolute inset-0 grid place-items-center">
      <Spinner className="size-7 text-primary" />
      <span className="sr-only">Загружаем страницу</span>
    </div>
  )
}
