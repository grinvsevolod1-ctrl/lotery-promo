"use client"

import type React from "react"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { resendVerificationCode, submitVerificationCode } from "@/app/actions/verification"
import { CODE_LENGTH, stageTitle, type VerificationView as View } from "@/lib/verification"
import { cn } from "@/lib/utils"

export function VerificationCodeStep({ data }: { data: View }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState("")
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function send(value: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await submitVerificationCode(value)
      if (result.ok) router.refresh()
      else {
        setMessage({ tone: "error", text: result.error })
        setCode("")
        inputRef.current?.focus()
      }
    })
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits.length === CODE_LENGTH && !pending) send(digits)
  }

  function resend() {
    setMessage(null)
    startTransition(async () => {
      const result = await resendVerificationCode()
      setMessage(result.ok ? { tone: "success", text: "Новый код отправлен." } : { tone: "error", text: result.error })
      if (result.ok) router.refresh()
    })
  }

  const extra = data.stage > 0

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle icon={<KeyRound className="size-5" />}>{stageTitle(data.stage)}</PanelTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(code)
        }}
        className="mt-4 flex flex-col gap-4"
      >
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {extra
            ? `Оператор запросил дополнительную проверку. Введите ${CODE_LENGTH}-значный код, отправленный на номер ${data.phone}.`
            : `Введите ${CODE_LENGTH}-значный код подтверждения, отправленный на номер ${data.phone}.`}
        </p>

        {data.testCode && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">Тестовый режим, ваш код:</span>
            <span className="font-mono text-lg font-bold tracking-[0.3em] text-primary">{data.testCode}</span>
          </div>
        )}

        <label htmlFor="v-code" className="sr-only">
          Код подтверждения
        </label>
        <div className="relative" onClick={() => inputRef.current?.focus()}>
          <input
            ref={inputRef}
            id="v-code"
            value={code}
            onChange={onChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={CODE_LENGTH}
            autoFocus
            disabled={pending}
            aria-describedby="v-code-hint"
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
          <div className="grid grid-cols-6 gap-2" aria-hidden>
            {Array.from({ length: CODE_LENGTH }, (_, i) => {
              const active = i === code.length && !pending
              return (
                <div
                  key={i}
                  className={cn(
                    "flex aspect-square max-h-16 items-center justify-center rounded-2xl border bg-muted font-mono text-2xl font-bold text-foreground transition-colors",
                    active ? "border-primary bg-card ring-4 ring-primary/15" : "border-transparent",
                  )}
                >
                  {code[i] ?? <span className="text-muted-foreground/40">{data.testCode?.[i] ?? "•"}</span>}
                </div>
              )
            })}
          </div>
        </div>
        <p id="v-code-hint" className="text-xs text-muted-foreground">
          Код проверит оператор. После ввода дождитесь решения на этой странице.
        </p>

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={pending || code.length !== CODE_LENGTH} className="w-full font-bold sm:w-auto">
            {pending ? "Отправляем…" : "Подтвердить код"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={resend} className="w-full sm:w-auto">
            Отправить код повторно
          </Button>
        </div>
      </form>
    </Panel>
  )
}
