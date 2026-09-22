"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  ShieldMark,
  UserMark,
  TicketMark,
  TrophyMark,
  GaugeMark,
  CoinMark,
} from "@/components/icons"
import { resolveTicket, setUserRole } from "@/app/actions/admin"

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

type AdminTicket = {
  id: number
  userId: string
  game: string
  numbers: string
  cost: number
  status: string
  prize: number
  createdAt: Date
  userName: string | null
  userEmail: string | null
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminView({
  stats,
  users,
  tickets,
  currentUserId,
}: {
  stats: { users: number; tickets: number; pending: number; paidOut: number }
  users: AdminUser[]
  tickets: AdminTicket[]
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<"tickets" | "users">("tickets")
  const [prizeInputs, setPrizeInputs] = useState<Record<number, string>>({})

  const doResolve = (id: number, outcome: "win" | "lose") =>
    startTransition(async () => {
      const prize = outcome === "win" ? Number(prizeInputs[id] ?? "0") : 0
      await resolveTicket(id, outcome, prize)
      router.refresh()
    })

  const doRole = (id: string, role: "user" | "admin") =>
    startTransition(async () => {
      await setUserRole(id, role)
      router.refresh()
    })

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-40" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 py-8">
        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-gold to-accent text-background shadow-lg">
              <ShieldMark className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-lg font-extrabold leading-none text-foreground">Панель управления</h1>
              <p className="text-xs text-muted-foreground">lotery.by · администрирование</p>
            </div>
          </div>
          <Link
            href="/cabinet"
            className="rounded-full bg-foreground/10 px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/15"
          >
            В кабинет
          </Link>
        </header>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<UserMark className="size-6" />} label="Пользователей" value={String(stats.users)} />
          <StatCard icon={<TicketMark className="size-6" />} label="Билетов продано" value={String(stats.tickets)} />
          <StatCard icon={<GaugeMark className="size-6" />} label="Ждут розыгрыша" value={String(stats.pending)} accent />
          <StatCard icon={<CoinMark className="size-6" />} label="Выплачено" value={`${stats.paidOut} BYN`} gold />
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-full bg-foreground/10 p-1">
          <TabButton active={tab === "tickets"} onClick={() => setTab("tickets")}>
            Билеты
          </TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>
            Пользователи
          </TabButton>
        </div>

        {tab === "tickets" ? (
          <section>
            {tickets.length === 0 ? (
              <Empty text="Билетов пока нет." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl">
                <div className="divide-y divide-border/50">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{t.game}</span>
                          <StatusBadge status={t.status} prize={t.prize} />
                        </div>
                        <p className="truncate font-mono text-xs text-muted-foreground">{t.numbers}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground/70">
                          {t.userName ?? "—"} · {t.userEmail ?? "—"} · {formatDate(t.createdAt)}
                        </p>
                      </div>
                      {t.status === "pending" ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="Приз"
                            value={prizeInputs[t.id] ?? ""}
                            onChange={(e) => setPrizeInputs((p) => ({ ...p, [t.id]: e.target.value }))}
                            className="w-24 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                          />
                          <Button size="sm" onClick={() => doResolve(t.id, "win")} disabled={isPending} className="bg-gold text-background hover:bg-gold/90 font-bold">
                            Выигрыш
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => doResolve(t.id, "lose")} disabled={isPending}>
                            Проигрыш
                          </Button>
                        </div>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground/70">Разыгран</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section>
            {users.length === 0 ? (
              <Empty text="Пользователей пока нет." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl">
                <div className="divide-y divide-border/50">
                  {users.map((u) => (
                    <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-foreground/10 text-foreground/70">
                          <UserMark className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{u.name}</span>
                            {u.role === "admin" && (
                              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">admin</span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          <p className="text-[11px] text-muted-foreground/70">с {formatDate(u.createdAt)}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {u.id === currentUserId ? (
                          <span className="text-xs text-muted-foreground/70">это вы</span>
                        ) : u.role === "admin" ? (
                          <Button size="sm" variant="secondary" onClick={() => doRole(u.id, "user")} disabled={isPending}>
                            Снять админа
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => doRole(u.id, "admin")} disabled={isPending} className="font-bold">
                            Сделать админом
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, accent, gold }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; gold?: boolean }) {
  const bg = gold ? "bg-gradient-to-br from-gold/20 to-accent/10" : accent ? "bg-gradient-to-br from-primary/20 to-accent/10" : "bg-card/70"
  const iconCls = gold ? "bg-gold/20 text-gold" : accent ? "bg-primary/20 text-primary" : "bg-foreground/10 text-foreground/70"
  return (
    <div className={`grain rounded-3xl border border-border/60 p-6 backdrop-blur-xl ${bg}`}>
      <span className={`mb-3 inline-flex rounded-xl p-2.5 ${iconCls}`}>{icon}</span>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  )
}

function StatusBadge({ status, prize }: { status: string; prize: number }) {
  if (status === "win") return <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">+{prize} BYN</span>
  if (status === "lose") return <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">без выигрыша</span>
  return <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">ожидает</span>
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${active ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30" : "text-foreground/70 hover:text-foreground"}`}
    >
      {children}
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grain rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
