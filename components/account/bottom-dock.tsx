"use client"

import Link from "next/link"
import { useEffect, useState, type ComponentType } from "react"
import { usePathname } from "next/navigation"
import {
  ArrowDownMark,
  CloverMark,
  GaugeMark,
  OrbChatMark,
  ShareMark,
  TicketMark,
  TrophyMark,
  UserMark,
  WalletMark,
} from "@/components/icons"
import { cn } from "@/lib/utils"

type Icon = ComponentType<{ className?: string }>
type NavItem = { href: string; label: string; icon: Icon }

const TABS_LEFT: NavItem[] = [
  { href: "/cabinet", label: "Кабинет", icon: GaugeMark },
  { href: "/play", label: "Игры", icon: TicketMark },
]
const TABS_RIGHT: NavItem[] = [
  { href: "/cabinet/wins", label: "Выигрыши", icon: TrophyMark },
  { href: "/cabinet/cards", label: "Карты", icon: WalletMark },
]
const ACTIONS: NavItem[] = [
  { href: "/play#buy", label: "Билет", icon: TicketMark },
  { href: "/play#spin", label: "Колесо", icon: CloverMark },
  { href: "/cabinet#funding", label: "Пополнить", icon: ArrowDownMark },
  { href: "/cabinet#referral", label: "Друзья", icon: ShareMark },
  { href: "/cabinet/support", label: "Поддержка", icon: OrbChatMark },
  { href: "/cabinet/profile", label: "Профиль", icon: UserMark },
]

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]"

function isActive(pathname: string, href: string) {
  return href === "/cabinet" ? pathname === "/cabinet" : pathname.startsWith(href)
}

export function BottomDock() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="Закрыть быстрые действия"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[6px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none invisible opacity-0",
        )}
      />

      <nav
        aria-label="Навигация кабинета"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <div className="relative w-full max-w-md">
          <div
            id="quick-actions"
            aria-hidden={!open}
            className={cn(
              "absolute inset-x-0 bottom-full mb-4 origin-bottom rounded-[28px] bg-card/95 p-3 shadow-[0_24px_60px_-20px_rgb(22_26_34/0.45)] ring-1 ring-border backdrop-blur-xl transition-[transform,opacity] duration-500 [transform:translateZ(0)]",
              EASE,
              open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0",
            )}
          >
            <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Быстрые действия</p>
            <ul className="grid grid-cols-3 gap-2">
              {ACTIONS.map(({ href, label, icon: Icon }, i) => (
                <li
                  key={href}
                  className={cn("transition-[transform,opacity] duration-500", EASE, open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}
                  style={{ transitionDelay: open ? `${60 + i * 25}ms` : "0ms" }}
                >
                  <Link
                    href={href}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center transition-colors duration-200 hover:bg-muted active:scale-[0.97]"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-6" />
                    </span>
                    <span className="text-xs font-semibold leading-tight text-foreground">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center rounded-[30px] bg-card/95 p-1.5 shadow-[0_10px_40px_-10px_rgb(22_26_34/0.35)] ring-1 ring-border backdrop-blur-lg [transform:translateZ(0)]">
            {TABS_LEFT.map((tab) => (
              <DockTab key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
            ))}

            <div className="flex w-[72px] shrink-0 justify-center">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="quick-actions"
                aria-label={open ? "Закрыть быстрые действия" : "Быстрые действия"}
                className={cn(
                  "grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_-8px] shadow-primary/70 transition-transform duration-300 active:scale-90",
                  EASE,
                )}
              >
                <DockToggleIcon open={open} />
              </button>
            </div>

            {TABS_RIGHT.map((tab) => (
              <DockTab key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}

// Four dots that collapse into a cross: reads as "more actions" without any glyph.
function DockToggleIcon({ open }: { open: boolean }) {
  const dot = cn("absolute size-[7px] rounded-full bg-current transition-[transform,opacity] duration-300", EASE)
  const bar = cn("absolute h-[2.5px] w-5 rounded-full bg-current transition-[transform,opacity] duration-300", EASE)
  return (
    <span aria-hidden="true" className="relative grid size-6 place-items-center">
      <span className={cn(dot, open ? "scale-0 opacity-0" : "-translate-x-[5px] -translate-y-[5px]")} />
      <span className={cn(dot, open ? "scale-0 opacity-0" : "translate-x-[5px] -translate-y-[5px]")} />
      <span className={cn(dot, open ? "scale-0 opacity-0" : "-translate-x-[5px] translate-y-[5px]")} />
      <span className={cn(dot, open ? "scale-0 opacity-0" : "translate-x-[5px] translate-y-[5px]")} />
      <span className={cn(bar, open ? "rotate-45 opacity-100" : "rotate-0 scale-50 opacity-0")} />
      <span className={cn(bar, open ? "-rotate-45 opacity-100" : "rotate-0 scale-50 opacity-0")} />
    </span>
  )
}

function DockTab({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-semibold transition-colors duration-200 active:scale-95",
        active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-[22px]" />
      <span className="w-full truncate px-0.5 text-center">{label}</span>
    </Link>
  )
}
