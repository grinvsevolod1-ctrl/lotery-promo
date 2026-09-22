import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getAdminStats, getAllTickets, getAllUsers } from "@/app/actions/admin"
import { AdminView } from "@/components/admin-view"

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  if (rows[0]?.role !== "admin") redirect("/cabinet")

  const [stats, users, tickets] = await Promise.all([
    getAdminStats(),
    getAllUsers(),
    getAllTickets(),
  ])

  return <AdminView stats={stats} users={users} tickets={tickets} currentUserId={session.user.id} />
}
