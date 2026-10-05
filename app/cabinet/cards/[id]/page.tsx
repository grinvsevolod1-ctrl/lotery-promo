import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getPaymentCards } from "@/app/actions/cards"
import { CardConfirmation } from "@/components/cabinet/cards/card-confirmation"

export const metadata: Metadata = { title: "Подтверждение карты — bytoloto.com" }

export default async function CardConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cardId = Number(id)
  if (!Number.isInteger(cardId) || cardId <= 0) notFound()

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const cards = await getPaymentCards()

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Подтверждение карты</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
          Следите за статусом здесь — мы сообщим, если понадобится код или ответ.
        </p>
      </div>
      <CardConfirmation cardId={cardId} initial={cards} />
    </div>
  )
}
