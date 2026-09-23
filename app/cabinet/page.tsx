import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { getBalance, getTickets, getTransactions } from "@/app/actions/cabinet"
import { CabinetView } from "@/components/cabinet-view"

export default async function CabinetPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const [balance, tickets, transactions] = await Promise.all([
    getBalance(),
    getTickets(),
    getTransactions(),
  ])

  const hasWelcome = transactions.some((t) => t.type === "welcome")

  return (
    <CabinetView
      user={{
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      }}
      balance={balance}
      tickets={tickets}
      transactions={transactions}
      hasWelcome={hasWelcome}
    />
  )
}
