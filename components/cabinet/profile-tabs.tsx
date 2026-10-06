import Link from "next/link"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, type VerificationStatus } from "@/lib/verification"

const TABS = [
  { key: "profile", href: "/cabinet/profile", label: "Профиль" },
  { key: "verification", href: "/cabinet/verification", label: "Верификация" },
] as const

const STATUS_TONE: Record<VerificationStatus, string> = {
  none: "bg-foreground/10 text-muted-foreground",
  pending: "bg-primary/15 text-primary",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
}

export function ProfileTabs({ active, status }: { active: (typeof TABS)[number]["key"]; status: VerificationStatus }) {
  return (
    <nav aria-label="Разделы профиля" className="flex gap-1 rounded-2xl bg-foreground/5 p-1">
      {TABS.map((tab) => {
        const current = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              current ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.key === "verification" && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS_TONE[status])}>
                {STATUS_LABEL[status]}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
