"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { BrandLogo } from "@/components/brand-logo"
import { HomeMark, LogoutMark, OrbChatMark, UserMark, WalletMark } from "@/components/icons"
import { cn } from "@/lib/utils"

const MENU = [
  { href: "/cabinet/profile", label: "Профиль и безопасность", icon: UserMark },
  { href: "/cabinet/cards", label: "Мои карты", icon: WalletMark },
  { href: "/cabinet/support", label: "Поддержка", icon: OrbChatMark },
  { href: "/", label: "На главную", icon: HomeMark },
]

export function AccountTopBar({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const initial = (name.trim()[0] ?? "?").toUpperCase()

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
    <header className="sticky top-3 z-40 mb-6 flex items-center justify-between gap-3 rounded-full bg-card/70 py-2 pl-5 pr-2 shadow-sm ring-1 ring-border backdrop-blur-2xl">
      <BrandLogo className="text-[24px] sm:text-[26px]" />

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Меню аккаунта"
          className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-foreground/5 active:scale-[0.97]"
        >
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-gold font-display text-sm font-black text-primary-foreground shadow-md shadow-primary/30">
            {initial}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-semibold text-foreground sm:block">{name}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div
          role="menu"
          aria-hidden={!open}
          className={cn(
            "absolute right-0 top-full mt-3 w-72 origin-top-right rounded-3xl bg-card/95 p-2 shadow-2xl ring-1 ring-border backdrop-blur-2xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
          )}
        >
          <div className="px-3 pb-3 pt-2">
            <p className="truncate font-display text-base font-extrabold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
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
              <LogoutMark className="size-4" />
            </span>
            Выйти
          </button>
        </div>
      </div>
    </header>
  )
}
