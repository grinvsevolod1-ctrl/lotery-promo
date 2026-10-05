"use client"

import Link from "next/link"
import { useEffect, useState, type ComponentType } from "react"
import { usePathname } from "next/navigation"
import { ArrowDownMark, CloverMark, GaugeMark, OrbChatMark, ShareMark, TicketMark, TrophyMark, WalletMark } from "@/components/icons"
import { cn } from "@/lib/utils"

type Icon = ComponentType<{ className?: string }>

const TABS_LEFT: { href: string; label: string; icon: Icon }[] = [
  { href: "/cabinet", label: "Кабинет", icon: GaugeMark },
  { href: "/play", label: "Игры", icon: TicketMark },
]
const TABS_RIGHT: { href: string; label: string; icon: Icon }[] = [
  { href: "/cabinet/wins", label: "Выигрыши", icon: TrophyMark },
  { href: "/cabinet/cards", label: "Карты", icon: WalletMark },
]

// Fan of quick actions laid out on an arc above the centre button (degrees, 180 = left).
const ACTIONS: { href: string; label: string; icon: Icon; angle: number }[] = [
  { href: "/play#buy", label: "Билет", icon: TicketMark, angle: 162 },
  { href: "/play#spin", label: "Колесо", icon: CloverMark, angle: 126 },
  { href: "/cabinet#funding", label: "Пополнить", icon: ArrowDownMark, angle: 90 },
  { href: "/cabinet#referral", label: "Друзья", icon: ShareMark, angle: 54 },
  { href: "/cabinet/support", label: "Поддержка", icon: OrbChatMark, angle: 18 },
]
const RADIUS = 122
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
          "fixed inset-0 z-40 bg-background/70 transition-opacity duration-300",
          open ? "opacity-100 backdrop-blur-sm" : "pointer-events-none invisible opacity-0",
        )}
      />

      <nav
        aria-label="Навигация кабинета"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <div className="relative w-full max-w-md">
          <ul id="quick-actions" aria-hidden={!open} className="pointer-events-none absolute bottom-7 left-1/2 size-0">
            {ACTIONS.map(({ href, label, icon: Icon, angle }, i) => {
              const rad = (angle * Math.PI) / 180
              const x = Math.cos(rad) * RADIUS
              const y = -Math.sin(rad) * RADIUS
              return (
                <li
                  key={href}
                  className={cn("absolute left-0 top-0 transition-[transform,opacity] duration-500", EASE, open ? "opacity-100" : "opacity-0")}
                  style={{
                    transform: open ? `translate(calc(${x}px - 50%), calc(${y}px - 50%)) scale(1)` : "translate(-50%, -50%) scale(0.3)",
                    transitionDelay: open ? `${i * 35}ms` : "0ms",
                  }}
                >
                  <Link
                    href={href}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className={cn("group flex flex-col items-center gap-1.5", open && "pointer-events-auto")}
                  >
                    <span className="grid size-14 place-items-center rounded-full bg-card text-primary shadow-xl ring-1 ring-border transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                      <Icon className="size-6" />
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
                      {label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center justify-between rounded-[30px] bg-card/95 p-1.5 shadow-[0_10px_40px_-10px_rgb(22_26_34/0.35)] ring-1 ring-border backdrop-blur-lg [transform:translateZ(0)]">
            {TABS_LEFT.map((tab) => (
              <DockTab key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
            ))}

            <div className="flex w-16 shrink-0 justify-center">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="quick-actions"
                aria-label={open ? "Закрыть быстрые действия" : "Быстрые действия"}
                className={cn(
                  "relative -mt-9 grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-[0_12px_30px_-6px] shadow-primary/60 ring-4 ring-background transition-transform duration-500 active:scale-90",
                  EASE,
                  open && "rotate-[135deg]",
                )}
              >
                <span className={cn("absolute font-display text-3xl font-black transition-[opacity,transform] duration-300", open ? "scale-50 opacity-0" : "opacity-100")}>!</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-7 transition-[opacity,transform] duration-300", open ? "opacity-100" : "scale-50 opacity-0")} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
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

function DockTab({ href, label, icon: Icon, active }: { href: string; label: string; icon: Icon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-semibold transition-colors duration-200 active:scale-95",
        active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("size-[22px] transition-transform duration-300", EASE, active && "-translate-y-px scale-110")} />
      <span className="truncate">{label}</span>
    </Link>
  )
}
