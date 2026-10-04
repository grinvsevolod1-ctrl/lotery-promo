"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, FormMessage } from "@/components/auth-shell"
import { Turnstile, TURNSTILE_ENABLED } from "@/components/turnstile"
import { TestMailNotice, getTestMail, type TestMail } from "@/components/test-mail-notice"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [testMail, setTestMail] = useState<TestMail[] | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (TURNSTILE_ENABLED && !captcha) {
      setError("Пройдите проверку «я не робот».")
      return
    }
    setLoading(true)

    const { data, error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
      fetchOptions: captcha ? { headers: { "x-captcha-response": captcha } } : undefined,
    })
    setLoading(false)

    if (error) {
      setCaptcha(null)
      setError(
        error.code === "VERIFICATION_FAILED" || error.code === "MISSING_RESPONSE"
          ? "Проверка «я не робот» не пройдена. Попробуйте ещё раз."
          : "Не удалось отправить письмо. Попробуйте ещё раз через минуту.",
      )
      return
    }
    setTestMail(getTestMail(data))
    setSentTo(email)
  }

  const backLink = (
    <Link href="/sign-in" className="font-semibold text-primary underline-offset-4 hover:underline">
      Вернуться ко входу
    </Link>
  )

  if (sentTo) {
    return (
      <AuthShell
        title="Письмо отправлено"
        subtitle={
          <>
            Если адрес <strong>{sentTo}</strong> зарегистрирован, мы отправили на него ссылку для
            смены пароля. Ссылка действует 1 час.
          </>
        }
        footer={backLink}
      >
        <div className="flex flex-col gap-4">
          <TestMailNotice letters={testMail} />
          <p className="text-center text-sm text-muted-foreground text-pretty">
            Письма нет? Загляните в папку «Спам».
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Укажите e-mail, на который зарегистрирован аккаунт, и мы пришлём ссылку для смены пароля"
      footer={backLink}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <Turnstile action="forgot-password" onToken={setCaptcha} />

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="cta-shine mt-2 w-full text-base font-bold"
        >
          {loading ? "Отправляем..." : "Отправить ссылку"}
        </Button>
      </form>
    </AuthShell>
  )
}
