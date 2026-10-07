"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { track } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, FormMessage } from "@/components/auth-shell"

const VERIFY_CALLBACK = "/verify-email"

const SIGN_UP_ERRORS: Record<string, string> = {
  USER_ALREADY_EXISTS: "Пользователь с таким e-mail уже зарегистрирован.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Пользователь с таким e-mail уже зарегистрирован.",
  TERMS_NOT_ACCEPTED: "Подтвердите, что вам есть 18 лет и вы согласны с правилами.",
  PASSWORD_TOO_SHORT: "Пароль слишком короткий — минимум 8 символов.",
}

export function AuthForm({
  mode,
  notice,
}: {
  mode: "sign-in" | "sign-up"
  notice?: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== "sign-up") return
    const from = new URLSearchParams(window.location.search).get("from") ?? "direct"
    track("signup_view", { from })
  }, [mode])
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isSignUp) {
      if (!termsAccepted) {
        setError(SIGN_UP_ERRORS.TERMS_NOT_ACCEPTED)
        return
      }
      setLoading(true)
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: VERIFY_CALLBACK,
        // Checked server-side in lib/auth.ts; the API refuses sign-ups without it.
        termsAccepted: true,
      } as Parameters<typeof authClient.signUp.email>[0])
      setLoading(false)
      if (error) {
        setError(SIGN_UP_ERRORS[error.code ?? ""] ?? "Не удалось создать аккаунт. Проверьте данные и попробуйте снова.")
        return
      }
      track("signup_success")
      if (!data?.token) {
        const signIn = await authClient.signIn.email({ email, password })
        if (signIn.error) {
          setError("Аккаунт создан. Войдите со своим e-mail и паролем.")
          return
        }
      }
      router.push("/cabinet")
      router.refresh()
      return
    }

    setLoading(true)
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/cabinet",
    })
    setLoading(false)

    if (error) {
      setError("Неверный e-mail или пароль.")
      return
    }

    track("signin_success")
    router.push("/cabinet")
    router.refresh()
  }

  const resend = async () => {
    if (!sentTo) return
    setLoading(true)
    await authClient.sendVerificationEmail({ email: sentTo, callbackURL: VERIFY_CALLBACK })
    setLoading(false)
    setResent(true)
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Проверьте почту"
        subtitle={
          <>
            Мы отправили письмо со ссылкой для подтверждения на <strong>{sentTo}</strong>.
            Перейдите по ней, чтобы завершить {isSignUp ? "регистрацию" : "вход"}.
          </>
        }
        footer={
          <Link href="/sign-in" className="font-semibold text-primary underline-offset-4 hover:underline">
            Вернуться ко входу
          </Link>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground text-pretty">
            Письма нет? Загляните в папку «Спам» или запросите новое.
          </p>
          {resent && <FormMessage tone="success">Письмо отправлено повторно.</FormMessage>}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={resend}
            disabled={loading || resent}
            className="w-full font-bold"
          >
            {loading ? "Отправляем..." : "Отправить ещё раз"}
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={isSignUp ? "Регистрация" : "Вход в кабинет"}
      subtitle={
        isSignUp
          ? "Создайте аккаунт и сразу получите приветственный бонус"
          : "Войдите, чтобы управлять билетами и бонусами"
      }
      footer={
        <>
          {isSignUp ? "Уже есть аккаунт? " : "Ещё нет аккаунта? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Войти" : "Зарегистрироваться"}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {notice && <FormMessage tone="success">{notice}</FormMessage>}

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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Пароль</Label>
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Забыли пароль?
              </Link>
            )}
          </div>
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

        {isSignUp && (
          <>
            <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                className="mt-0.5 size-4 shrink-0 accent-[oklch(0.66_0.27_350)]"
              />
              <span className="text-pretty">
                Мне есть 18 лет, я принимаю{" "}
                <Link href="/rules" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
                  правила акции
                </Link>
                ,{" "}
                <Link href="/terms" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
                  оферту
                </Link>{" "}
                и согласен на обработку персональных данных согласно{" "}
                <Link href="/privacy" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
                  политике конфиденциальности
                </Link>
                .
              </span>
            </label>
          </>
        )}

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="cta-shine mt-2 w-full text-base font-bold"
        >
          {loading ? "Подождите..." : isSignUp ? "Создать аккаунт" : "Войти"}
        </Button>
      </form>
    </AuthShell>
  )
}
