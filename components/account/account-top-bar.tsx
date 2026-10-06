"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  CreditCard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { BrandLogo } from "@/components/brand-logo"
import { useLiveEvents } from "@/components/use-live-events"
import { cn } from "@/lib/utils"

const MENU = [
  { href: "/cabinet", label: "Личный кабинет", icon: LayoutGrid },
  { href: "/cabinet/wins", label: "Мои выигрыши", icon: Trophy },
  { href: "/cabinet/cards", label: "Банковские карты", icon: CreditCard },
  { href: "/cabinet#referral", label: "Пригласить друзей", icon: Users },
  { href: "/cabinet/profile", label: "Профиль и безопасность", icon: ShieldCheck },
  { href: "/cabinet/support", label: "Поддержка", icon: LifeBuoy },
]

const money = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function AccountTopBar({ name, email, balance }: { name: string; email: string; balance: number | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const initial = (name.trim()[0] ?? "?").toUpperCase()

  useLiveEvents("me", [], () => router.refresh())
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="sticky top-0 z-40 -mx-4 -mt-3 mb-6 bg-gradient-to-b from-background from-[2.4rem] to-transparent to-[2.4rem] px-4 pb-1 pt-3 sm:-mx-6 sm:px-6">
    <header className="flex items-center justify-between gap-2 rounded-full bg-card py-1.5 pl-4 pr-1.5 shadow-sm ring-1 ring-border sm:pl-5">
      <Link href="/play" aria-label="К играм" className="min-w-0 shrink">
        <BrandLogo className="text-[20px] sm:text-[26px]" />
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        {balance !== null && (
          <div className="flex items-center gap-1 rounded-full bg-card py-1 pl-3.5 pr-1 text-foreground ring-1 ring-border">
            <Link href="/cabinet/deposit" className="flex items-baseline gap-1 tabular-nums" aria-label={`Баланс ${money.format(balance)} BYN`}>
              <span className="text-sm font-extrabold">{money.format(balance)}</span>
              <span className="text-[10px] font-bold text-primary">BYN</span>
            </Link>
            <Link
              href="/cabinet/deposit"
              aria-label="Пополнить баланс"
              className="ml-1 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-90"
            >
              <Plus className="size-4" strokeWidth={3} />
            </Link>
          </div>
        )}

        <div ref={rootRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Меню аккаунта"
            className="flex items-center gap-1 rounded-full p-0.5 transition-colors hover:bg-foreground/5 active:scale-[0.97] sm:pr-2"
          >
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-gold font-display text-sm font-black text-primary-foreground shadow-md shadow-primary/30">
              {initial}
            </span>
            <ChevronDown className={cn("hidden size-4 text-muted-foreground transition-transform duration-300 sm:block", open && "rotate-180")} />
          </button>

          <div
            role="menu"
            aria-hidden={!open}
            className={cn(
              "absolute right-0 top-full mt-3 w-72 origin-top-right rounded-3xl bg-card p-2 shadow-2xl ring-1 ring-border transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
            )}
          >
            <div className="flex items-center gap-3 px-3 pb-3 pt-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-gold font-display text-base font-black text-primary-foreground">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-extrabold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <ul className="flex flex-col py-1">
              {MENU.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    role="menuitem"
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                  >
                    <span className="grid size-8 place-items-center rounded-xl bg-foreground/5 text-foreground/70">
                      <Icon className="size-4" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onClick={async () => {
                await authClient.signOut()
                router.push("/")
                router.refresh()
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-destructive/10">
                <LogOut className="size-4" />
              </span>
              Выйти
            </button>
          </div>
        </div>
      </div>
    </header>
    </div>
  )
}
