import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AccountTopBar } from "@/components/account/account-top-bar"
import { BottomDock } from "@/components/account/bottom-dock"
import { LuckBanner } from "@/components/luck-banner"
import { db } from "@/lib/db"
import { balanceOf } from "@/lib/db/ledger"
import { unreadCount } from "@/lib/notifications"

export async function AccountShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const [balance, unread] = await Promise.all([
    balanceOf(db, session.user.id).catch(() => null),
    unreadCount(session.user.id).catch(() => 0),
  ])

  return (
    <div className="relative min-h-svh overflow-x-clip bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] aura-bg opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-4 pb-36 pt-4 sm:px-6 sm:pt-6">
        <AccountTopBar name={session.user.name} email={session.user.email} balance={balance} />
        <main>
          <LuckBanner />
          {children}
        </main>
      </div>
      <BottomDock unread={unread} />
    </div>
  )
}
