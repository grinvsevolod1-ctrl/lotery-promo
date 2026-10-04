"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DevicesMark, KeyMark, MailMark, TrashMark, UserMark, CheckMark } from "@/components/icons"
import { Notice, Panel, PanelTitle } from "@/components/cabinet/panel"
import { TestMailNotice, getTestMail, type TestMail } from "@/components/test-mail-notice"
import { formatDate, formatDateTime } from "@/lib/format"

export type SessionInfo = {
  id: string
  token: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: Date
  updatedAt: Date
  current: boolean
}

type Message = { tone: "error" | "success"; text: string } | null

function describeUserAgent(ua: string | null) {
  if (!ua) return "Неизвестное устройство"
  const browser = /YaBrowser/i.test(ua)
    ? "Яндекс Браузер"
    : /Edg\//i.test(ua)
      ? "Edge"
      : /OPR\//i.test(ua)
        ? "Opera"
        : /Firefox/i.test(ua)
          ? "Firefox"
          : /Chrome/i.test(ua)
            ? "Chrome"
            : /Safari/i.test(ua)
              ? "Safari"
              : "Браузер"
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad/i.test(ua)
        ? "iOS"
        : /Mac OS/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : ""
  return os ? `${browser} · ${os}` : browser
}

export function ProfileView({
  user,
  sessions,
  notice,
}: {
  user: { name: string; email: string; createdAt: Date; emailVerified: boolean }
  sessions: SessionInfo[]
  notice?: string
}) {
  return (
    <div className="flex flex-col gap-6">
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountCard user={user} />
        <PasswordCard />
        <EmailCard currentEmail={user.email} />
        <SessionsCard sessions={sessions} />
      </div>

      <DeleteAccountCard />
    </div>
  )
}

function AccountCard({ user }: { user: { name: string; email: string; createdAt: Date; emailVerified: boolean } }) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await authClient.updateUser({ name: name.trim() })
    setLoading(false)
    if (error) {
      setMessage({ tone: "error", text: "Не удалось сохранить имя." })
      return
    }
    setMessage({ tone: "success", text: "Имя обновлено." })
    router.refresh()
  }

  return (
    <Panel className="p-5 sm:p-6" accent>
      <PanelTitle icon={<UserMark className="size-5" />}>Аккаунт</PanelTitle>
      <dl className="mb-5 flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">E-mail</dt>
          <dd className="flex items-center gap-1.5 font-semibold text-foreground">
            {user.email}
            {user.emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gold">
                <CheckMark className="size-3" /> подтверждён
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">С нами с</dt>
          <dd className="font-semibold text-foreground">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
      <form onSubmit={save} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-name">Имя</Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" />
        </div>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <Button type="submit" disabled={loading || name.trim() === user.name || name.trim().length < 2} className="w-full font-bold sm:w-auto">
          {loading ? "Сохраняем..." : "Сохранить имя"}
        </Button>
      </form>
    </Panel>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (next !== confirm) {
      setMessage({ tone: "error", text: "Пароли не совпадают." })
      return
    }
    setLoading(true)
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    })
    setLoading(false)
    if (error) {
      setMessage({
        tone: "error",
        text: error.code === "INVALID_PASSWORD" ? "Текущий пароль указан неверно." : "Не удалось сменить пароль.",
      })
      return
    }
    setCurrent("")
    setNext("")
    setConfirm("")
    setMessage({ tone: "success", text: "Пароль изменён. Остальные устройства разлогинены." })
  }

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle icon={<KeyMark className="size-5" />}>Смена пароля</PanelTitle>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pw-current">Текущий пароль</Label>
          <Input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pw-next">Новый пароль</Label>
          <Input id="pw-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Минимум 8 символов" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pw-confirm">Повторите новый пароль</Label>
          <Input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <Button type="submit" disabled={loading} className="w-full font-bold sm:w-auto">
          {loading ? "Меняем..." : "Сменить пароль"}
        </Button>
      </form>
    </Panel>
  )
}

function EmailCard({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [testMail, setTestMail] = useState<TestMail[] | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    const { data, error } = await authClient.changeEmail({
      newEmail: email.trim(),
      callbackURL: "/cabinet/profile?notice=email",
    })
    setLoading(false)
    if (error) {
      setMessage({
        tone: "error",
        text: error.code === "COULDNT_UPDATE_YOUR_EMAIL" || /exist/i.test(error.message ?? "")
          ? "Этот e-mail уже используется."
          : "Не удалось отправить запрос на смену e-mail.",
      })
      return
    }
    setTestMail(getTestMail(data))
    setMessage({
      tone: "success",
      text: `Мы отправили письмо на ${currentEmail}. Подтвердите смену по ссылке — затем проверьте новый адрес.`,
    })
    setEmail("")
  }

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle icon={<MailMark className="size-5" />}>Смена e-mail</PanelTitle>
      <p className="mb-4 text-sm text-muted-foreground text-pretty">
        Для безопасности подтверждение придёт на текущий адрес, а новый адрес нужно будет подтвердить отдельно.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-email">Новый e-mail</Label>
          <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="new@example.com" />
        </div>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <TestMailNotice letters={testMail} />
        <Button type="submit" disabled={loading || !email} className="w-full font-bold sm:w-auto">
          {loading ? "Отправляем..." : "Сменить e-mail"}
        </Button>
      </form>
    </Panel>
  )
}

function SessionsCard({ sessions }: { sessions: SessionInfo[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)

  const revoke = async (token: string) => {
    setBusy(token)
    setMessage(null)
    const { error } = await authClient.revokeSession({ token })
    setBusy(null)
    if (error) setMessage({ tone: "error", text: "Не удалось завершить сессию." })
    router.refresh()
  }

  const revokeOthers = async () => {
    setBusy("others")
    setMessage(null)
    const { error } = await authClient.revokeOtherSessions()
    setBusy(null)
    if (error) setMessage({ tone: "error", text: "Не удалось завершить остальные сессии." })
    else setMessage({ tone: "success", text: "Остальные устройства разлогинены." })
    router.refresh()
  }

  const others = sessions.filter((s) => !s.current)

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle
        icon={<DevicesMark className="size-5" />}
        aside={
          others.length > 0 && (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={busy !== null}
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              Завершить остальные
            </button>
          )
        }
      >
        Активные сессии
      </PanelTitle>
      <ul className="flex flex-col gap-2">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="truncate">{describeUserAgent(s.userAgent)}</span>
                {s.current && (
                  <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gold">
                    это устройство
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.ipAddress ?? "IP неизвестен"} · активность {formatDateTime(s.updatedAt)}
              </p>
            </div>
            {!s.current && (
              <button
                type="button"
                onClick={() => revoke(s.token)}
                disabled={busy !== null}
                className="shrink-0 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-destructive/20 hover:text-destructive disabled:opacity-50"
              >
                {busy === s.token ? "..." : "Завершить"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {message && <div className="mt-3"><Notice tone={message.tone}>{message.text}</Notice></div>}
    </Panel>
  )
}

function DeleteAccountCard() {
  const [password, setPassword] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [testMail, setTestMail] = useState<TestMail[] | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    const { data, error } = await authClient.deleteUser({ password, callbackURL: "/?notice=account-deleted" })
    setLoading(false)
    if (error) {
      setMessage({
        tone: "error",
        text: error.code === "INVALID_PASSWORD" ? "Пароль указан неверно." : "Не удалось отправить запрос на удаление.",
      })
      return
    }
    setTestMail(getTestMail(data))
    setPassword("")
    setConfirmed(false)
    setMessage({ tone: "success", text: "Мы отправили письмо с подтверждением удаления. Аккаунт будет удалён после перехода по ссылке." })
  }

  return (
    <Panel className="border-destructive/40 p-5 sm:p-6">
      <PanelTitle icon={<TrashMark className="size-5 text-destructive" />}>Удаление аккаунта</PanelTitle>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground text-pretty">
        Удаление безвозвратно: билеты, бонусы и история операций будут стёрты. Для подтверждения мы отправим письмо на ваш e-mail.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:max-w-md">
        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-password">Пароль</Label>
          <Input id="delete-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[oklch(0.62_0.24_20)]"
          />
          <span>Я понимаю, что все данные будут удалены без возможности восстановления</span>
        </label>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <TestMailNotice letters={testMail} />
        <Button type="submit" variant="destructive" disabled={loading || !confirmed || !password} className="w-full font-bold sm:w-auto">
          {loading ? "Отправляем..." : "Удалить аккаунт"}
        </Button>
      </form>
    </Panel>
  )
}
