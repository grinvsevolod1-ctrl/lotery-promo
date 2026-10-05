import { headers } from "next/headers"
import { and, count, eq, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { referral, transaction } from "@/lib/db/schema"
import { REFERRAL_BONUS } from "@/lib/lottery"
import { getOrCreateReferralCode } from "@/lib/referrals"
import { ReferralLink } from "@/components/cabinet/referral-link"

export async function ReferralPanel() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const userId = session.user.id
  const [code, [invitedRow], [earnedRow]] = await Promise.all([
    getOrCreateReferralCode(userId),
    db.select({
      total: count(),
      rewarded: sql<number>`count(*) filter (where ${referral.status} = 'rewarded')`.mapWith(Number),
    }).from(referral).where(eq(referral.userId, userId)),
    db.select({ sum: sql<number>`coalesce(sum(${transaction.amount}), 0)`.mapWith(Number) })
      .from(transaction).where(and(eq(transaction.userId, userId), eq(transaction.type, "referral"))),
  ])
  const invited = invitedRow?.total ?? 0
  const rewarded = invitedRow?.rewarded ?? 0
  const earned = earnedRow?.sum ?? 0
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-foreground sm:p-6" aria-labelledby="referral-heading">
      <header className="flex flex-col gap-2">
        <h2 id="referral-heading" className="text-balance text-xl font-bold">Пригласите друзей</h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Поделитесь ссылкой. Друг засчитывается сразу после регистрации, а вы получаете +{REFERRAL_BONUS} BYN на баланс автоматически, как только он привяжет карту.
        </p>
      </header>
      <ReferralLink path={`/invite/${code}`} />
      <dl className="flex flex-wrap gap-6 text-sm">
        <div><dt className="text-muted-foreground">Приглашено</dt><dd className="text-xl font-semibold tabular-nums">{invited}</dd></div>
        <div><dt className="text-muted-foreground">С бонусом</dt><dd className="text-xl font-semibold tabular-nums">{rewarded}</dd></div>
        <div><dt className="text-muted-foreground">Заработано</dt><dd className="text-xl font-semibold tabular-nums">{earned} BYN</dd></div>
      </dl>
    </section>
  )
}
