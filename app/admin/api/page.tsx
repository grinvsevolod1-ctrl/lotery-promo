import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getWebhookSettings } from "@/app/actions/admin"
import { getCardStatusCounts, getDeliveryLog, listAdminCardRequests } from "@/app/actions/admin-api"
import { AdminNav } from "@/components/admin/admin-nav"
import { ApiKeyCard } from "@/components/admin/api/api-key-card"
import { DeliveryLog } from "@/components/admin/api/delivery-log"
import { RequestCard } from "@/components/admin/api/request-card"
import { RequestFilters } from "@/components/admin/api/request-filters"
import { WebhookSettings } from "@/components/admin/webhook-settings"
import { AutoRefresh } from "@/components/auto-refresh"

export const metadata = { title: "API — админка bytoloto.com", robots: { index: false, follow: false } }

export default async function AdminApiPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login")
  const { status, q } = await searchParams

  const [requests, counts, log, webhook] = await Promise.all([
    listAdminCardRequests(status, q),
    getCardStatusCounts(),
    getDeliveryLog(),
    getWebhookSettings(),
  ])

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <AutoRefresh intervalMs={10_000} />
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <AdminNav active="api" subtitle="Ручное управление заявками — запасной канал к внешнему сервису" />

        <div className="grid gap-4 lg:grid-cols-2">
          <ApiKeyCard isSet={Boolean(process.env.OPERATOR_API_KEY?.trim())} />
          <WebhookSettings settings={webhook} />
        </div>

        <section className="flex flex-col gap-4" aria-labelledby="requests-heading">
          <div>
            <h2 id="requests-heading" className="font-display text-xl font-bold text-foreground">Заявки на привязку карт</h2>
            <p className="text-sm text-muted-foreground">
              Любое действие здесь работает так же, как запрос через API, и отправляет вебхук внешнему сервису.
            </p>
          </div>
          <RequestFilters status={status} query={q} counts={counts} />
          {requests.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Заявок не найдено.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {requests.map((request) => (
                <RequestCard key={request.requestNo} request={request} />
              ))}
            </div>
          )}
        </section>

        <DeliveryLog entries={log} />
      </div>
    </main>
  )
}
