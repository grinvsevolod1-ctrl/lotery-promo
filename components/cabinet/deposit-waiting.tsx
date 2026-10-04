"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { demoPaymentPath } from "@/lib/review-transitions"
import type { FundingRequestRow } from "@/app/actions/funding"

export function DepositWaiting({ id, request, onClose }: { id: number; request?: FundingRequestRow; onClose: () => void }) {
  const router = useRouter()
  useEffect(() => {
    if (request?.status === "awaiting_payment") router.push(demoPaymentPath(id))
  }, [id, request?.status, router])

  const rejected = request?.status === "rejected"
  const completed = request?.status === "approved"
  const terminal = rejected || completed
  return (
    <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-foreground" aria-live="polite">
      <h3 className="font-semibold">{completed ? "Тестовое пополнение завершено" : rejected ? "Тестовая заявка отклонена" : "Ожидаем тестовую ссылку"}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{completed ? "Условный баланс зачислен. Реального перевода денег не было." : rejected ? "Администратор отклонил заявку. Реального списания средств не было." : `Заявка #${id} отправлена в Telegram. После решения администратора откроется внутренняя симуляция оплаты — без банковских реквизитов.`}</p>
      {request?.status === "awaiting_payment" && <Link href={demoPaymentPath(id)} className="text-sm font-semibold text-primary underline">Открыть тестовую ссылку</Link>}
      <button type="button" onClick={onClose} className="self-start rounded-full border border-border px-4 py-2 text-sm font-semibold">{terminal ? "Закрыть" : "Продолжить в кабинете"}</button>
    </section>
  )
}
