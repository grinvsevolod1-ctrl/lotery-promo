"use client"

import { useState } from "react"

export function ReferralLink({ path }: { path: string }) {
  const [notice, setNotice] = useState("")
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString())
      setNotice("Ссылка скопирована.")
    } catch {
      setNotice("Копирование недоступно. Откройте ссылку и скопируйте адрес из браузера.")
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <a href={path} className="break-all text-sm text-primary underline underline-offset-4">{path}</a>
      <button type="button" onClick={copy} className="min-h-11 self-start rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Скопировать приглашение</button>
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  )
}
