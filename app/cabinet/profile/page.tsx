import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { and, eq, gt } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { session as sessionTable } from "@/lib/db/schema"
import { ProfileView, type SessionInfo } from "@/components/cabinet/profile-view"
import { ProfileTabs } from "@/components/cabinet/profile-tabs"
import { getMyVerification } from "@/app/actions/verification"

export const metadata: Metadata = {
  title: "Профиль — bytoloto.com",
  robots: { index: false, follow: false },
}

const NOTICES: Record<string, string> = {
  email: "Смена e-mail подтверждена. Если новый адрес ещё не подтверждён — проверьте почту.",
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session?.user) redirect("/sign-in")

  // auth.api.listSessions requires a "fresh" session (signed in within a day) and throws otherwise,
  // so the list is read straight from the session table, scoped to the signed-in user.
  const rawSessions = await db
    .select()
    .from(sessionTable)
    .where(and(eq(sessionTable.userId, session.user.id), gt(sessionTable.expiresAt, new Date())))
  const sessions: SessionInfo[] = rawSessions
    .map((s) => ({
      id: s.id,
      token: s.token,
      userAgent: s.userAgent ?? null,
      ipAddress: s.ipAddress ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      current: s.token === session.session.token,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.updatedAt.getTime() - a.updatedAt.getTime())

  const { notice } = await searchParams
  const verification = await getMyVerification(session.user.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Профиль</h1>
        <p className="text-sm text-muted-foreground">Данные аккаунта, безопасность и устройства</p>
      </div>
      <ProfileTabs active="profile" status={verification?.status ?? "none"} />
      <ProfileView
        user={{
          name: session.user.name,
          email: session.user.email,
          createdAt: session.user.createdAt,
          emailVerified: session.user.emailVerified,
        }}
        sessions={sessions}
        notice={notice ? NOTICES[notice] : undefined}
      />
    </div>
  )
}
