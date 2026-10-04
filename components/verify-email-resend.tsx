"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, FormMessage } from "@/components/auth-shell"
import { TestMailNotice, getTestMail, type TestMail } from "@/components/test-mail-notice"

export function VerifyEmailResend() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [testMail, setTestMail] = useState<TestMail[] | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data } = await authClient.sendVerificationEmail({ email, callbackURL: "/verify-email" })
    setLoading(false)
    setTestMail(getTestMail(data))
    setSent(true)
  }

  return (
    <AuthShell
      title="Ссылка недействительна"
      subtitle="Ссылка для подтверждения устарела или уже использована. Укажите e-mail, и мы отправим новую."
      footer={
        <Link href="/sign-in" className="font-semibold text-primary underline-offset-4 hover:underline">
          Вернуться ко входу
        </Link>
      }
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

        <TestMailNotice letters={testMail} />
        {sent && !testMail && (
          <FormMessage tone="success">
            Если адрес зарегистрирован и ещё не подтверждён, мы отправили новое письмо.
          </FormMessage>
        )}

        <Button
          type="submit"
          disabled={loading || sent}
          size="lg"
          className="cta-shine mt-2 w-full text-base font-bold"
        >
          {loading ? "Отправляем..." : "Отправить новую ссылку"}
        </Button>
      </form>
    </AuthShell>
  )
}
