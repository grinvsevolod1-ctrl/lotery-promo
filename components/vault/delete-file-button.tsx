"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { vaultDeleteFile } from "@/app/actions/vault"

export function DeleteFileButton({ id }: { id: number }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()

  function onClick() {
    if (!confirm) {
      setConfirm(true)
      window.setTimeout(() => setConfirm(false), 4000)
      return
    }
    start(async () => {
      const result = await vaultDeleteFile(id)
      if (result.ok) {
        router.replace("/vault")
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-live="polite"
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-60 ${
        confirm ? "border-destructive bg-destructive text-destructive-foreground" : "border-border/60 text-muted-foreground hover:bg-card hover:text-destructive"
      }`}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
      {confirm ? "Точно удалить?" : "Удалить"}
    </button>
  )
}
