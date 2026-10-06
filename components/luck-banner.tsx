import Link from "next/link"
import { Sparkles } from "lucide-react"
import { getLuckAttempts } from "@/lib/luck-server"

export async function LuckBanner() {
  const luck = await getLuckAttempts()
  if (luck <= 1) return null

  return (
    <Link
      href="/rules"
      className="mb-4 flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15" aria-hidden>
        <Sparkles className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-bold leading-tight">{`Буст удачи x${luck} включён`}</span>
        <span className="text-xs leading-snug opacity-90 text-pretty">
          {`В каждом раунде засчитывается лучшая из ${luck} попыток`}
        </span>
      </span>
    </Link>
  )
}
