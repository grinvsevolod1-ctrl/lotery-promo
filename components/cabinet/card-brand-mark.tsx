import type { CardBrand } from '@/lib/payment-cards'
import { cn } from '@/lib/utils'

// Фирменные знаки платёжных систем. Visa и Mastercard — официальные контуры
// (theSVG.org, товарные знаки принадлежат правообладателям), БЕЛКАРТ и МИР —
// аккуратные текстовые вордмарки. Все знаки монохромные (currentColor), чтобы
// органично смотреться и на цветной карте (белым), и в списке (тёмным).

function VisaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="Visa"
      className={className}
    >
      <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
    </svg>
  )
}

function MastercardMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      role="img"
      aria-label="Mastercard"
      className={className}
    >
      <circle cx="15" cy="12" r="11" fill="#EB001B" />
      <circle cx="23" cy="12" r="11" fill="#F79E1B" />
      <path
        d="M19 3.6a11 11 0 000 16.8 11 11 0 000-16.8z"
        fill="#FF5F00"
      />
    </svg>
  )
}

function WordmarkBadge({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-heading text-[0.8rem] font-extrabold uppercase leading-none tracking-tight',
        className,
      )}
    >
      {label}
    </span>
  )
}

/** Знак бренда для карты (по умолчанию — белый, монохромный). */
export function CardBrandMark({
  brand,
  className,
}: {
  brand: CardBrand
  className?: string
}) {
  switch (brand) {
    case 'visa':
      return <VisaMark className={cn('h-6 w-auto', className)} />
    case 'mastercard':
      return <MastercardMark className={cn('h-6 w-auto', className)} />
    case 'belkart':
      return <WordmarkBadge label="БЕЛКАРТ" className={className} />
    case 'mir':
      return <WordmarkBadge label="МИР" className={className} />
    default:
      return null
  }
}

