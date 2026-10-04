import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getPaymentCards } from "@/app/actions/cards"
import { PaymentCards } from "@/components/cabinet/payment-cards"

export const metadata: Metadata = { title: "Мои карты — lotery.by" }

export default async function CardsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const cards = await getPaymentCards()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Мои карты</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
          Здесь будут только карты, которые вы привязали самостоятельно через платёжного провайдера.
        </p>
      </div>
      <PaymentCards initial={cards} />
    </div>
  )
}
