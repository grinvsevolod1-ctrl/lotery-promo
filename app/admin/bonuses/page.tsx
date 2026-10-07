import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { listBonusOffers } from "@/app/actions/admin-bonuses"
import { AdminNav } from "@/components/admin/admin-nav"
import { BonusOffersPanel } from "@/components/admin/bonus-offers-panel"
import { GAME_TITLES } from "@/lib/bonus-offers"

export const metadata = { title: "Бонусы — админка bytoloto.com", robots: { index: false, follow: false } }

export default async function AdminBonusesPage() {
  if (!(await isAdmin())) redirect("/admin/login")
  const offers = await listBonusOffers()

  const stats = [
    { label: "Всего акций", value: offers.length },
    { label: "Включены", value: offers.filter((o) => o.active).length },
    { label: "На слоты", value: offers.filter((o) => o.category === "slots").length },
    { label: "На live-игры", value: offers.filter((o) => o.category === "live").length },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav active="bonuses" subtitle="Акции на слоты и live-игры: условия, отыгрыш, промокоды и рассылка игрокам" />

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/60 bg-card p-4">
              <dt className="text-xs text-muted-foreground">{card.label}</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums text-foreground">{card.value}</dd>
            </div>
          ))}
        </dl>

        <BonusOffersPanel offers={offers} games={GAME_TITLES} />
      </div>
    </main>
  )
}
