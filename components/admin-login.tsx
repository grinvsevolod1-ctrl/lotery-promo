"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldMark } from "@/components/icons"
import { adminLogin } from "@/app/actions/admin"

export function AdminLogin({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(adminLogin, {})

  return (
    <main className="relative min-h-svh overflow-hidden bg-background flex items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-60" aria-hidden />
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; На главную
        </Link>

        <div className="grain relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-gold to-accent text-background shadow-lg">
              <ShieldMark className="size-7" />
            </span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Панель оператора
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Вход для сотрудников</p>
          </div>

          {!configured ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Не заданы переменные окружения <code>ADMIN_USERNAME</code> и{" "}
              <code>ADMIN_PASSWORD</code>. Добавьте их в настройки проекта, чтобы войти.
            </p>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Логин</Label>
                <Input id="username" name="username" required autoComplete="username" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              )}

              <Button type="submit" disabled={pending} size="lg" className="mt-2 w-full font-bold">
                {pending ? "Проверяем..." : "Войти"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
