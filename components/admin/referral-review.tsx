"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { reviewReferral } from "@/app/actions/admin"
import { actionErrorMessage } from "@/lib/action-error"

export function ReferralReview({ referrals }: { referrals: { id: number; createdAt: Date }[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  function act(id: number, decision: "approve" | "reject") {
    setError("")
    startTransition(async () => {
      try {
        const changed = await reviewReferral(id, decision)
        if (!changed) setError("Приглашение уже рассмотрено.")
        router.refresh()
      } catch (e) {
        setError(actionErrorMessage(e, "Не удалось рассмотреть приглашение."))
      }
    })
  }
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-foreground" aria-labelledby="admin-referrals">
      <h2 id="admin-referrals" className="text-xl font-bold">Реферальные приглашения</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">Подтверждение учитывает приглашение, но не начисляет деньги.</p>
      {referrals.length === 0 ? <p className="text-sm text-muted-foreground">Новых приглашений нет.</p> : (
        <ul className="flex flex-col gap-4">{referrals.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">Приглашение #{item.id}</span>
            <div className="flex flex-wrap gap-2">
              <button disabled={pending} onClick={() => act(item.id, "approve")} className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Подтвердить</button>
              <button disabled={pending} onClick={() => act(item.id, "reject")} className="min-h-11 rounded-full border border-border px-4 text-sm disabled:opacity-50">Отклонить</button>
            </div>
          </li>
        ))}</ul>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
