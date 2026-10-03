import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ProfileView, type SessionInfo } from "@/components/cabinet/profile-view"

export const metadata: Metadata = {
  title: "Профиль — lotery.by",
  robots: { index: false, follow: false },
}

const NOTICES: Record<string, string> = {
  email: "Смена e-mail подтверждена. Если новый адрес ещё не подтверждён — проверьте почту.",
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session?.user) redirect("/sign-in")

  const rawSessions = await auth.api.listSessions({ headers: requestHeaders })
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Профиль</h1>
        <p className="text-sm text-muted-foreground">Данные аккаунта, безопасность и устройства</p>
      </div>
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
