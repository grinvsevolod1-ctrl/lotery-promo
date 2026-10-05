"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminLogin } from "@/app/actions/admin"
import { fieldClass } from "@/components/ui/input"

export function AdminLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await adminLogin(password)
    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }
    router.push("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль администратора"
        autoFocus
        className={fieldClass}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="h-13 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground transition disabled:opacity-50"
      >
        {pending ? "Проверка…" : "Войти"}
      </button>
    </form>
  )
}
