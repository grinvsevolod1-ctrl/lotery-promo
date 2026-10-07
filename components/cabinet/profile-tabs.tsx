import Link from "next/link"
import { cn } from "@/lib/utils"
import { STATUS_LABEL, type VerificationStatus } from "@/lib/verification"

const TABS = [
  { key: "profile", href: "/cabinet/profile", label: "Профиль" },
  { key: "verification", href: "/cabinet/verification", label: "Верификация" },
] as const

const STATUS_DOT: Record<VerificationStatus, string> = {
  none: "bg-muted-foreground/60",
  code: "bg-primary",
  code_review: "bg-primary",
  pending: "bg-primary",
  approved: "bg-success",
  rejected: "bg-destructive",
  no_msi: "bg-destructive",
}

const STATUS_TEXT: Record<VerificationStatus, string> = {
  none: "text-muted-foreground",
  code: "text-primary",
  code_review: "text-primary",
  pending: "text-primary",
  approved: "text-success",
  rejected: "text-destructive",
  no_msi: "text-destructive",
}

export function ProfileTabs({ active, status }: { active: (typeof TABS)[number]["key"]; status: VerificationStatus }) {
  return (
    <nav aria-label="Разделы профиля" className="grid grid-cols-2 gap-1 rounded-2xl bg-foreground/5 p-1">
      {TABS.map((tab) => {
        const current = tab.key === active
        const withStatus = tab.key === "verification"
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center transition-colors",
              current ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="truncate text-sm font-semibold leading-tight">{tab.label}</span>
            {withStatus && (
              <span
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold leading-none",
                  STATUS_TEXT[status],
                )}
              >
                <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])} />
                {STATUS_LABEL[status]}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
