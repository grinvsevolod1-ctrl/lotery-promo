"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Gamepad2, Gift, Wallet, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }

const TABS: Tab[] = [
  { href: "/play", label: "Игры", icon: Gamepad2, match: (p) => p.startsWith("/play") },
  { href: "/cabinet/deposit", label: "Кошелёк", icon: Wallet, match: (p) => p.startsWith("/cabinet/deposit") },
  { href: "/cabinet/notifications", label: "Уведомления", icon: Bell, match: (p) => p.startsWith("/cabinet/notifications") },
  { href: "/cabinet/bonuses", label: "Бонусы", icon: Gift, match: (p) => p.startsWith("/cabinet/bonuses") },
]

export function BottomDock({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <ul className="flex w-full max-w-md items-stretch gap-1 rounded-[28px] bg-card/90 p-1.5 shadow-[0_14px_40px_-18px_rgb(22_26_34/0.35)] ring-1 ring-border backdrop-blur-xl backdrop-saturate-150 [transform:translateZ(0)]">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          const badge = href === "/cabinet/notifications" && unread > 0 ? unread : 0
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-[22px] px-1 py-2 text-[11px] font-semibold transition-colors duration-200 active:scale-95",
                  active ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span
                      className={cn(
                        "absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-extrabold leading-none ring-2",
                        active ? "bg-background text-primary ring-primary" : "bg-primary text-primary-foreground ring-card",
                      )}
                    >
                      {badge > 9 ? "9+" : badge}
                      <span className="sr-only"> непрочитанных</span>
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
