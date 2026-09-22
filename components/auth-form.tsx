"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CloverTicket } from "@/components/icons"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(
        isSignUp
          ? "Не удалось создать аккаунт. Возможно, e-mail уже занят."
          : "Неверный e-mail или пароль.",
      )
      return
    }

    router.push("/cabinet")
    router.refresh()
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-background flex items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-60" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; На главную
        </Link>

        <div className="orbit-border rounded-3xl">
          <div className="grain relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <CloverTicket className="size-7" />
              </span>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground text-balance">
                {isSignUp ? "Регистрация" : "Вход в кабинет"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">
                {isSignUp
                  ? "Создайте аккаунт и получите приветственный бонус"
                  : "Войдите, чтобы управлять билетами и бонусами"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Иван Иванов"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Минимум 8 символов"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="mt-2 w-full cta-shine text-base font-bold"
              >
                {loading ? "Подождите..." : isSignUp ? "Создать аккаунт" : "Войти"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Уже есть аккаунт? " : "Ещё нет аккаунта? "}
              <Link
                href={isSignUp ? "/sign-in" : "/sign-up"}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {isSignUp ? "Войти" : "Зарегистрироваться"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
