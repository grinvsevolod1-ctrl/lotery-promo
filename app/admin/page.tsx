import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { getPendingCards, getPendingFundingRequests } from "@/app/actions/admin"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login")

  const [cards, requests] = await Promise.all([getPendingCards(), getPendingFundingRequests()])

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <AdminDashboard cards={cards} requests={requests} />
      </div>
    </main>
  )
}
