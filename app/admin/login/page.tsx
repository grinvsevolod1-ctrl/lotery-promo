import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { AdminLoginForm } from "@/components/admin/admin-login-form"

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-8">
        <h1 className="font-display text-xl font-extrabold text-foreground">Вход в админку</h1>
        <p className="mt-1 text-sm text-muted-foreground">Подтверждение карт и заявок на вывод/пополнение</p>
        <AdminLoginForm />
      </div>
    </main>
  )
}
