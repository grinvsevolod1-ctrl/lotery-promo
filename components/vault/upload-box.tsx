"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, UploadCloud, X } from "lucide-react"
import { formatBytes } from "@/lib/format-bytes"

type Status = "queued" | "uploading" | "done" | "error" | "cancelled"

type Item = {
  key: string
  name: string
  size: number
  loaded: number
  status: Status
  error?: string
}

const RETRIES = 4
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

class UploadError extends Error {}

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as { error?: string; received?: number | null; id?: string; chunkSize?: number }
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/vault/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  return { response, data: await readJson(response) }
}

async function uploadOne(file: File, onProgress: (loaded: number) => void, isCancelled: () => boolean) {
  const init = await post({ step: "init" })
  if (!init.response.ok || !init.data.id || !init.data.chunkSize) throw new UploadError(init.data.error ?? "Не удалось начать загрузку.")
  const { id, chunkSize } = { id: init.data.id, chunkSize: init.data.chunkSize }

  let offset = 0
  while (offset < file.size) {
    if (isCancelled()) {
      await post({ step: "abort", id }).catch(() => undefined)
      throw new UploadError("Отменено.")
    }
    const piece = file.slice(offset, offset + chunkSize)
    let attempt = 0
    for (;;) {
      try {
        const response = await fetch(`/api/vault/upload?id=${id}&offset=${offset}`, { method: "PUT", body: piece })
        const data = await readJson(response)
        if (response.ok && typeof data.received === "number") {
          offset = data.received
          break
        }
        if (response.status === 401) throw new UploadError(data.error ?? "Сессия истекла. Войдите заново.")
        // The server already has this piece (a lost response was retried): continue from where it actually is.
        if (response.status === 409 && typeof data.received === "number") {
          offset = data.received
          break
        }
        throw new Error(data.error ?? `Ошибка ${response.status}`)
      } catch (error) {
        if (error instanceof UploadError || ++attempt >= RETRIES) throw error instanceof UploadError ? error : new UploadError("Соединение прервано, не удалось отправить часть файла.")
        await sleep(800 * attempt)
      }
    }
    onProgress(Math.min(offset, file.size))
  }

  const done = await post({ step: "done", id, name: file.name, size: file.size, mimeType: file.type })
  if (!done.response.ok) throw new UploadError(done.data.error ?? "Не удалось завершить загрузку.")
}

export function UploadBox() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const files = useRef(new Map<string, File>())
  const cancelled = useRef(new Set<string>())
  const running = useRef(false)

  const patch = useCallback((key: string, change: Partial<Item>) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item))), [])

  const pump = useCallback(async () => {
    if (running.current) return
    running.current = true
    let uploaded = false
    for (;;) {
      const next = [...files.current.keys()].find((key) => !cancelled.current.has(key))
      if (!next) break
      const file = files.current.get(next) as File
      files.current.delete(next)
      patch(next, { status: "uploading" })
      try {
        await uploadOne(file, (loaded) => patch(next, { loaded }), () => cancelled.current.has(next))
        patch(next, { status: "done", loaded: file.size })
        uploaded = true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ошибка загрузки."
        patch(next, { status: cancelled.current.has(next) ? "cancelled" : "error", error: message })
      }
    }
    running.current = false
    if (uploaded) router.refresh()
  }, [patch, router])

  const add = useCallback(
    (list: FileList | File[]) => {
      const added: Item[] = []
      for (const file of Array.from(list)) {
        if (file.size === 0) continue
        const key = `${file.name}-${file.size}-${crypto.randomUUID()}`
        files.current.set(key, file)
        added.push({ key, name: file.name, size: file.size, loaded: 0, status: "queued" })
      }
      if (added.length === 0) return
      setItems((current) => [...added, ...current])
      void pump()
    },
    [pump],
  )

  const active = items.some((item) => item.status === "uploading" || item.status === "queued")
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [active])

  const cancel = (item: Item) => {
    cancelled.current.add(item.key)
    files.current.delete(item.key)
    if (item.status === "queued") patch(item.key, { status: "cancelled", error: "Отменено." })
  }

  return (
    <section aria-label="Загрузить файлы" className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          add(event.dataTransfer.files)
        }}
        className={`flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-8 text-center transition sm:flex-row sm:text-left ${
          dragging ? "border-primary bg-primary/10" : "border-border/60 bg-card/40"
        }`}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <UploadCloud className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Загрузить файлы</p>
          <p className="text-sm text-muted-foreground text-pretty">Перетащите сюда или выберите. Любой размер, несколько файлов сразу; SQL и .sql.gz откроются в удобном виде.</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Выбрать файлы
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files) add(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {items.slice(0, 12).map((item) => {
            const percent = item.size > 0 ? Math.round((item.loaded / item.size) * 100) : 0
            return (
              <li key={item.key} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
                <span className="shrink-0">
                  {item.status === "done" ? (
                    <CheckCircle2 className="size-5 text-primary" aria-hidden />
                  ) : item.status === "error" || item.status === "cancelled" ? (
                    <AlertCircle className="size-5 text-destructive" aria-hidden />
                  ) : (
                    <Loader2 className={`size-5 text-muted-foreground ${item.status === "uploading" ? "animate-spin" : ""}`} aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{item.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.status === "uploading" || item.status === "done" ? `${formatBytes(item.loaded)} из ${formatBytes(item.size)}` : formatBytes(item.size)}
                    </span>
                  </div>
                  {item.status === "error" || item.status === "cancelled" ? (
                    <p className="text-xs text-destructive">{item.error}</p>
                  ) : (
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      aria-label={`Загрузка ${item.name}`}
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/60"
                    >
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${item.status === "done" ? 100 : percent}%` }} />
                    </div>
                  )}
                </div>
                {(item.status === "uploading" || item.status === "queued") && (
                  <button type="button" onClick={() => cancel(item)} aria-label={`Отменить ${item.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-foreground">
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
