import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getPendingCards, getPendingFundingRequests, getPendingReferrals } from "@/app/actions/admin"
import { ReferralReview } from "@/components/admin/referral-review"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login")

  const [cards, requests, referrals] = await Promise.all([getPendingCards(), getPendingFundingRequests(), getPendingReferrals()])

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <p className="text-sm leading-relaxed text-muted-foreground">Все подтверждения — только внутренние тестовые операции. Telegram-кнопки доступны только в личном чате администратора.</p>
        <AdminDashboard cards={cards} requests={requests} />
        <ReferralReview referrals={referrals} />
      </div>
    </main>
  )
}
