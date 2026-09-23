import { isAdmin, adminCredentialsConfigured } from "@/lib/admin-session"
import { getAdminStats, getAllTickets, getAllUsers, getAuthRequests } from "@/app/actions/admin"
import { AdminView } from "@/components/admin-view"
import { AdminLogin } from "@/components/admin-login"

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLogin configured={adminCredentialsConfigured()} />
  }

  const [stats, requests, users, tickets] = await Promise.all([
    getAdminStats(),
    getAuthRequests(),
    getAllUsers(),
    getAllTickets(),
  ])

  return <AdminView stats={stats} requests={requests} users={users} tickets={tickets} />
}
