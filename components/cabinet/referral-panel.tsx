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
  const [code, [row]] = await Promise.all([
    getOrCreateReferralCode(userId),
    db.select({ total: count() }).from(referral).where(eq(referral.userId, userId)),
  ])
  const invited = row?.total ?? 0
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-foreground sm:p-6" aria-labelledby="referral-heading">
      <header className="flex flex-col gap-2">
        <h2 id="referral-heading" className="text-balance text-xl font-bold">Пригласите друзей</h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">Поделитесь ссылкой — друг засчитывается автоматически сразу после регистрации.</p>
      </header>
      <ReferralLink path={`/invite/${code}`} />
      <dl className="flex flex-wrap gap-6 text-sm">
        <div><dt className="text-muted-foreground">Приглашено друзей</dt><dd className="text-xl font-semibold tabular-nums">{invited}</dd></div>
      </dl>
    </section>
  )
}
