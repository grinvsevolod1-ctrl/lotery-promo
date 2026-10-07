import { OFFER_CATEGORIES, offerConditions, offerHeadline, type BonusOfferRow } from "@/lib/bonus-offers"

export function BonusOffersList({ offers }: { offers: BonusOfferRow[] }) {
  if (offers.length === 0) return null
  return (
    <section aria-labelledby="offers-title" className="flex flex-col gap-4">
      <h2 id="offers-title" className="px-1 font-display text-2xl font-extrabold text-foreground">
        Акции на игры
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {offers.map((offer) => (
          <li key={offer.id} className="min-w-0">
            <details className="group flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5">
              <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">{offerHeadline(offer)}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {offer.gameTitle ?? OFFER_CATEGORIES[offer.category]}
                  </span>
                </span>
                <span className="font-semibold leading-snug text-foreground text-pretty">{offer.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{offer.description}</span>
                <span className="text-xs font-semibold text-primary group-open:hidden">Условия</span>
              </summary>
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/60 pt-3 text-sm text-foreground">
                {offerConditions(offer).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {offer.promoCode && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {"Промокод: "}
                  <span className="rounded-lg bg-muted px-2 py-0.5 font-mono font-bold text-foreground">{offer.promoCode}</span>
                  {" — сообщите его в поддержку при пополнении."}
                </p>
              )}
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
