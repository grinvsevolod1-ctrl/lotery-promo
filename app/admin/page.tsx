import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getLuckSettings, getPendingCards, getPendingFundingRequests, getPendingReferrals, getWebhookSettings } from "@/app/actions/admin"
import { WebhookSettings } from "@/components/admin/webhook-settings"
import { LuckSettings } from "@/components/admin/luck-settings"
import { CryptoWallets } from "@/components/admin/crypto-wallets"
import { getRecentInvoices, getWallets } from "@/lib/crypto/deposits"
import { ReferralReview } from "@/components/admin/referral-review"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AutoRefresh } from "@/components/auto-refresh"
import { AdminNav } from "@/components/admin/admin-nav"

export const metadata = { title: "Админка — bytoloto.com", robots: { index: false, follow: false } }

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login")

  const [cards, requests, referrals, webhook, luck, wallets, recentInvoices] = await Promise.all([
    getPendingCards(),
    getPendingFundingRequests(),
    getPendingReferrals(),
    getWebhookSettings(),
    getLuckSettings(),
    getWallets(),
    getRecentInvoices(15),
  ])

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={60_000} liveScope="admin" liveTopics={["admin:cards", "admin:counts"]} />
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <AdminNav active="queue" subtitle="Пополнения, выводы и рефералы" />
        <p className="text-sm leading-relaxed text-muted-foreground">Платёжные операции и привязка карт выполняются вручную через Telegram-бота. Кнопки доступны только в личном чате администратора.</p>
        <AdminDashboard cards={cards} requests={requests} />
        <ReferralReview referrals={referrals} />
        <LuckSettings settings={luck} />
        <CryptoWallets wallets={wallets} recent={recentInvoices} />
        <WebhookSettings settings={webhook} />
      </div>
    </main>
  )
}
