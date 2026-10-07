import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getTelegramSettings } from "@/app/actions/admin-telegram"
import { AdminNav } from "@/components/admin/admin-nav"
import { TelegramSettingsForm } from "@/components/admin/telegram-settings"

export const metadata = { title: "Telegram — админка bytoloto.com", robots: { index: false, follow: false } }

export default async function AdminTelegramPage() {
  if (!(await isAdmin())) redirect("/admin/login")
  const settings = await getTelegramSettings()

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <AdminNav active="telegram" subtitle="Бот и администраторы, которые получают заявки в Telegram" />
        <TelegramSettingsForm settings={settings} />
      </div>
    </main>
  )
}
