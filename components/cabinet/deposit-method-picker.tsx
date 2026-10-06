import Link from "next/link"
import { CryptoIconStack } from "@/components/crypto-icon"
import { cn } from "@/lib/utils"

type Props = {
  active: "card" | "crypto" | null
  hasCard: boolean
  cardLabel: string | null
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DepositMethodPicker({ active, hasCard, cardLabel }: Props) {
  const tile = "group flex min-h-40 flex-col justify-between gap-5 rounded-3xl p-5 ring-1 transition-all"
  return (
    <nav aria-label="Способ пополнения" className="grid gap-3 sm:grid-cols-2">
      <Link
        href={hasCard ? "/cabinet/deposit?method=card" : "/cabinet/cards"}
        aria-current={active === "card" ? "page" : undefined}
        className={cn(
          tile,
          active === "card" ? "bg-primary/10 ring-2 ring-primary" : "bg-card ring-border hover:ring-foreground/30",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-16 items-end rounded-lg bg-foreground p-2" aria-hidden>
            <span className="flex gap-0.5">
              <span className="size-3 rounded-full bg-primary" />
              <span className="-ml-1.5 size-3 rounded-full bg-background/70" />
            </span>
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">BYN</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-display text-lg font-extrabold text-foreground">Банковская карта</span>
            <span className="block text-sm text-muted-foreground">
              {hasCard ? (cardLabel ?? "Привязанная карта") : "Сначала привяжите карту"}
            </span>
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
            <Arrow />
          </span>
        </div>
      </Link>

      <Link
        href="/cabinet/deposit/crypto"
        className={cn(
          tile,
          active === "crypto" ? "bg-primary/10 ring-2 ring-primary" : "bg-card ring-border hover:ring-foreground/30",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <CryptoIconStack assets={["USDT_TRC20", "BTC", "ETH", "TON", "TRX", "LTC"]} size={30} />
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Авто</span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-display text-lg font-extrabold text-foreground">Криптовалюта</span>
            <span className="block text-sm text-muted-foreground">USDT, BTC, ETH, TON и другие · курс онлайн</span>
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
            <Arrow />
          </span>
        </div>
      </Link>
    </nav>
  )
}
