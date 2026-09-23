"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  TicketMark,
  WalletMark,
  TrophyMark,
  BoltMark,
  UserMark,
  LogoutMark,
  ShieldMark,
  CoinMark,
} from "@/components/icons"
import { buyTicket, claimWelcomeBonus } from "@/app/actions/cabinet"

type Ticket = {
  id: number
  game: string
  numbers: string
  cost: number
  status: string
  prize: number
  drawAt: Date | null
  createdAt: Date
}

type Transaction = {
  id: number
  type: string
  amount: number
  description: string
  createdAt: Date
}

const GAMES = [
  { name: "Суперлото", cost: 3, tone: "from-primary to-accent" },
  { name: "Пятёрочка", cost: 2, tone: "from-accent to-gold" },
  { name: "КЕНО", cost: 1, tone: "from-gold to-primary" },
]

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "В ожидании тиража", cls: "bg-foreground/10 text-foreground/70" },
  win: { label: "Выигрыш", cls: "bg-gold/20 text-gold" },
  lose: { label: "Без выигрыша", cls: "bg-foreground/10 text-muted-foreground" },
}

function formatDate(d: Date | string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CabinetView({
  user,
  balance,
  tickets,
  transactions,
  hasWelcome,
}: {
  user: { name: string; email: string; role: string }
  balance: number
  tickets: Ticket[]
  transactions: Transaction[]
  hasWelcome: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const wins = tickets.filter((t) => t.status === "win").length
  const isAdmin = user.role === "admin"

  const doBuy = (game: string) =>
    startTransition(async () => {
      setMsg(null)
      const res = await buyTicket(game)
      if (!res.ok) setMsg(res.error)
      else router.refresh()
    })

  const doWelcome = () =>
    startTransition(async () => {
      setMsg(null)
      const res = await claimWelcomeBonus()
      if (!res.ok) setMsg(res.error)
      else router.refresh()
    })

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-40" aria-hidden />

      <div className="container-page relative max-w-6xl py-8">
        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="lotery.by — на главную">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
              <TicketMark className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
              lotery<span className="text-gold">.by</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold/25"
              >
                <ShieldMark className="size-4" />
                Админка
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await authClient.signOut()
                router.push("/")
                router.refresh()
              }}
              className="flex items-center gap-2 rounded-full bg-foreground/10 px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/15"
            >
              <LogoutMark className="size-4" />
              Выйти
            </button>
          </div>
        </header>

        {/* Greeting */}
        <div className="mb-8 flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <UserMark className="size-7" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Привет, {user.name.split(" ")[0] || "игрок"}!
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<WalletMark className="size-6" />} label="Баланс бонусов" value={`${balance} BYN`} accent />
          <StatCard icon={<TicketMark className="size-6" />} label="Всего билетов" value={String(tickets.length)} />
          <StatCard icon={<TrophyMark className="size-6" />} label="Выигрышей" value={String(wins)} />
        </div>

        {msg && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {msg}
          </div>
        )}

        {!hasWelcome && (
          <div className="orbit-border mb-8 rounded-3xl">
            <div className="grain flex flex-col items-start justify-between gap-4 rounded-3xl border border-border/60 bg-card/80 p-6 backdrop-blur-xl sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
                  <CoinMark className="size-6" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold text-foreground">Приветственный бонус</h2>
                  <p className="text-sm text-muted-foreground">Получите 20 BYN на первый билет</p>
                </div>
              </div>
              <Button onClick={doWelcome} disabled={isPending} size="lg" className="cta-shine font-bold">
                Получить 20 BYN
              </Button>
            </div>
          </div>
        )}

        {/* Buy tickets */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-foreground">
            <BoltMark className="size-5 text-gold" />
            Купить билет
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {GAMES.map((g) => (
              <div key={g.name} className="grain group relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 backdrop-blur-xl transition-transform hover:-translate-y-1">
                <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${g.tone} p-3 text-primary-foreground shadow-lg`}>
                  <TicketMark className="size-6" />
                </div>
                <h3 className="font-display text-lg font-extrabold text-foreground">{g.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">Случайная комбинация · {g.cost} BYN</p>
                <Button
                  onClick={() => doBuy(g.name)}
                  disabled={isPending || balance < g.cost}
                  className="w-full font-bold"
                >
                  {balance < g.cost ? "Мало бонусов" : `Играть за ${g.cost} BYN`}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Tickets */}
          <section>
            <h2 className="mb-4 font-display text-xl font-extrabold text-foreground">Мои билеты</h2>
            {tickets.length === 0 ? (
              <EmptyState text="Пока нет билетов. Купите первый выше!" />
            ) : (
              <ul className="flex flex-col gap-3">
                {tickets.map((t) => {
                  const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.pending
                  return (
                    <li key={t.id} className="grain flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-xl">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{t.game}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{t.numbers}</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">{formatDate(t.createdAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>
                        {t.status === "win" ? `+${t.prize} BYN` : s.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Transactions */}
          <section>
            <h2 className="mb-4 font-display text-xl font-extrabold text-foreground">История баланса</h2>
            {transactions.length === 0 ? (
              <EmptyState text="Операций пока нет." />
            ) : (
              <ul className="flex flex-col gap-3">
                {transactions.map((tx) => (
                  <li key={tx.id} className="grain flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-xl">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground/70">{formatDate(tx.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 font-display text-lg font-extrabold ${tx.amount >= 0 ? "text-gold" : "text-muted-foreground"}`}>
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`grain rounded-3xl border border-border/60 p-6 backdrop-blur-xl ${accent ? "bg-gradient-to-br from-primary/20 to-accent/10" : "bg-card/70"}`}>
      <span className={`mb-3 inline-flex rounded-xl p-2.5 ${accent ? "bg-primary/20 text-primary" : "bg-foreground/10 text-foreground/70"}`}>
        {icon}
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grain rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
