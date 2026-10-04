"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { TicketMark, LogoutMark, UserMark, TrophyMark, HomeMark, WalletMark } from "@/components/icons"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/cabinet", label: "Играть", icon: TicketMark },
  { href: "/cabinet/cards", label: "Карты", icon: WalletMark },
  { href: "/cabinet/profile", label: "Профиль", icon: UserMark },
  { href: "/results", label: "Выигрыши", icon: TrophyMark },
]

export function CabinetHeader() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="group flex items-center gap-2.5" aria-label="lotery.by — на главную">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 transition-transform group-hover:-rotate-6">
          <TicketMark className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
          lotery<span className="text-gold">.by</span>
        </span>
      </Link>

      <nav aria-label="Разделы кабинета" className="order-last flex w-full gap-1 overflow-x-auto rounded-full bg-foreground/5 p-1 sm:order-none sm:w-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
                active ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="grid size-10 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground sm:hidden"
          aria-label="На главную"
        >
          <HomeMark className="size-5" />
        </Link>
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
  )
}
