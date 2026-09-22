import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getBalance, getTickets, getTransactions } from "@/app/actions/cabinet"
import { CabinetView } from "@/components/cabinet-view"

export default async function CabinetPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const [balance, tickets, transactions] = await Promise.all([
    getBalance(),
    getTickets(),
    getTransactions(),
  ])

  const hasWelcome = transactions.some((t) => t.type === "welcome")

  return (
    <CabinetView
      user={{
        name: session.user.name,
        email: session.user.email,
        role: (session.user as { role?: string }).role ?? "user",
      }}
      balance={balance}
      tickets={tickets}
      transactions={transactions}
      hasWelcome={hasWelcome}
    />
  )
}
