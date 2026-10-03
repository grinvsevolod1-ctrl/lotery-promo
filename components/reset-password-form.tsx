"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, FormMessage } from "@/components/auth-shell"

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Пароли не совпадают.")
      return
    }

    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)

    if (error) {
      setError("Ссылка недействительна или устарела. Запросите новую.")
      return
    }

    router.push("/sign-in?reset=1")
  }

  return (
    <AuthShell
      title="Новый пароль"
      subtitle="Придумайте новый пароль для входа в кабинет"
      footer={
        <Link
          href="/forgot-password"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Запросить новую ссылку
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Новый пароль</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Минимум 8 символов"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">Повторите пароль</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Ещё раз"
          />
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="cta-shine mt-2 w-full text-base font-bold"
        >
          {loading ? "Сохраняем..." : "Сохранить пароль"}
        </Button>
      </form>
    </AuthShell>
  )
}
