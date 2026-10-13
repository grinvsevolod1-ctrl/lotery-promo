import type { Metadata } from "next"
import Link from "next/link"
import { Bell, ChevronRight, CreditCard, Gift, Trophy, Wallet, type LucideIcon } from "lucide-react"
import { getNotifications } from "@/app/actions/notifications"
import { MarkNotificationsRead } from "@/components/cabinet/mark-notifications-read"
import { requireSession } from "@/lib/require-session"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Уведомления — bytoloto.com" }

const KIND: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  money: { icon: Wallet, tone: "bg-accent/12 text-accent", label: "Кошелёк" },
  card: { icon: CreditCard, tone: "bg-foreground/8 text-foreground", label: "Карты" },
  bonus: { icon: Gift, tone: "bg-primary/12 text-primary", label: "Бонусы" },
  win: { icon: Trophy, tone: "bg-primary/12 text-primary", label: "Выигрыш" },
  system: { icon: Bell, tone: "bg-foreground/8 text-foreground", label: "ByToLoto" },
}

const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" })
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" })

function when(date: Date) {
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000)
  if (minutes > -1) return "только что"
  if (minutes > -60) return rtf.format(minutes, "minute")
  if (minutes > -24 * 60) return rtf.format(Math.round(minutes / 60), "hour")
  if (minutes > -7 * 24 * 60) return rtf.format(Math.round(minutes / 1440), "day")
  return dateFmt.format(date)
}

export default async function NotificationsPage() {
  await requireSession()
  const items = await getNotifications()
  const unread = items.filter((n) => !n.readAt).length

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Входящие</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-foreground">Уведомления</h1>
        </div>
        <span className="rounded-full bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground ring-1 ring-border">
          {unread > 0 ? `${unread} новых` : "Всё прочитано"}
        </span>
      </header>

      {unread > 0 && <MarkNotificationsRead />}

      <ul className="flex flex-col gap-2">
        {items.map((n) => {
          const kind = KIND[n.kind] ?? KIND.system
          const Icon = kind.icon
          const content = (
            <>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", kind.tone)}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {kind.label}
                  <span aria-hidden>·</span>
                  <time dateTime={n.createdAt.toISOString()} className="normal-case tracking-normal">{when(n.createdAt)}</time>
                </span>
                <span className="mt-0.5 block font-bold leading-snug text-foreground text-pretty">{n.title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground text-pretty whitespace-pre-line">{n.body}</span>
              </span>
              {!n.readAt && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-label="Новое" />}
              {n.href && n.readAt && <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />}
            </>
          )
          const className = cn(
            "flex items-start gap-3 rounded-3xl p-4 ring-1 transition-colors",
            n.readAt ? "bg-card ring-border" : "bg-card ring-primary/40 shadow-md shadow-primary/10",
          )
          return (
            <li key={n.id}>
              {n.href ? (
                <Link href={n.href} className={cn(className, "hover:ring-foreground/25")}>{content}</Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
        Здесь — зачисления и выводы, статусы карт, бонусы и крупные выигрыши. Храним последние 60 событий.
      </p>
    </div>
  )
}
