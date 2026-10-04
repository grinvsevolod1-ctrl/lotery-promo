import { headers } from "next/headers"
import { eq, count } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { referral } from "@/lib/db/schema"
import { getOrCreateReferralCode } from "@/lib/referrals"
import { ReferralLink } from "@/components/cabinet/referral-link"

export async function ReferralPanel() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const userId = session.user.id
  const [code, groups] = await Promise.all([
    getOrCreateReferralCode(userId),
    db.select({ status: referral.status, total: count() }).from(referral).where(eq(referral.userId, userId)).groupBy(referral.status),
  ])
  const totals = Object.fromEntries(groups.map((g) => [g.status, g.total]))
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-foreground sm:p-6" aria-labelledby="referral-heading">
      <header className="flex flex-col gap-2">
        <h2 id="referral-heading" className="text-balance text-xl font-bold">Пригласите друзей</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Регистрации по вашей ссылке учитываются после создания нового аккаунта. Приглашения проходят проверку; денежных бонусов нет.</p>
      </header>
      <ReferralLink path={`/invite/${code}`} />
      <dl className="flex flex-wrap gap-6 text-sm">
        <div><dt className="text-muted-foreground">На рассмотрении</dt><dd className="text-xl font-semibold">{totals.pending ?? 0}</dd></div>
        <div><dt className="text-muted-foreground">Подтверждено</dt><dd className="text-xl font-semibold">{totals.approved ?? 0}</dd></div>
        <div><dt className="text-muted-foreground">Отклонено</dt><dd className="text-xl font-semibold">{totals.rejected ?? 0}</dd></div>
      </dl>
    </section>
  )
}
