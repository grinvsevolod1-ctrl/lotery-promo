import Link from "next/link"
import { ChevronRight, CreditCard } from "lucide-react"
import { CryptoIconStack } from "@/components/crypto-icon"
import { cn } from "@/lib/utils"

type Method = "card" | "crypto"

type Props = {
  active: Method | null
  cardHref: string
  cryptoHref: string
  hasCard: boolean
  cardLabel: string | null
  cryptoHint: string
}

export function WalletMethodPicker({ active, cardHref, cryptoHref, hasCard, cardLabel, cryptoHint }: Props) {
  return (
    <nav aria-label="Способ" className="grid grid-cols-2 gap-3">
      <MethodTile
        href={cardHref}
        active={active === "card"}
        icon={
          <span className="grid size-11 place-items-center rounded-2xl bg-accent/12 text-accent">
            <CreditCard className="size-6" />
          </span>
        }
        badge="BYN"
        title="Картой"
        hint={hasCard ? (cardLabel ?? "Привязанная карта") : "Привяжите карту"}
        warn={!hasCard}
      />
      <MethodTile
        href={cryptoHref}
        active={active === "crypto"}
        icon={<CryptoIconStack assets={["USDT_TRC20", "BTC", "ETH", "TON"]} size={28} />}
        badge="8 монет"
        title="Криптой"
        hint={cryptoHint}
      />
    </nav>
  )
}

function MethodTile({
  href,
  active,
  icon,
  badge,
  title,
  hint,
  warn = false,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  badge: string
  title: string
  hint: string
  warn?: boolean
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-36 flex-col justify-between gap-4 rounded-3xl p-4 ring-1 transition-all active:scale-[0.98] sm:p-5",
        active ? "bg-card ring-2 ring-primary shadow-lg shadow-primary/15" : "bg-card ring-border hover:ring-foreground/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {icon}
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{badge}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block font-display text-lg font-extrabold text-foreground">{title}</span>
          <span className={cn("block truncate text-xs", warn ? "font-semibold text-primary" : "text-muted-foreground")}>{hint}</span>
        </span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <ChevronRight className="size-4" strokeWidth={2.6} />
        </span>
      </div>
    </Link>
  )
}
