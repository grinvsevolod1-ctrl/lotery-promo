"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LockKeyhole } from "lucide-react"
import { vaultLogin } from "@/app/actions/vault"
import { fieldClass } from "@/components/ui/input"

export function VaultLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await vaultLogin(password)
    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }
    router.replace("/vault")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" aria-describedby={error ? "vault-error" : undefined}>
      <label className="sr-only" htmlFor="vault-password">
        Пароль
      </label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="vault-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Секретный пароль"
          autoFocus
          autoComplete="current-password"
          className={`${fieldClass} pl-11`}
        />
      </div>
      {error && (
        <p id="vault-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Проверка…" : "Открыть"}
      </button>
    </form>
  )
}
