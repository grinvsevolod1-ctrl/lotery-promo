"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { UserMark, LogoutMark } from "@/components/icons"

export function HeaderAuthNav() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="h-9 w-24 rounded-full bg-foreground/10 animate-pulse" aria-hidden />
  }

  if (!session?.user) {
    return (
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Link
          href="/sign-in"
          className="shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-foreground/80 transition-colors hover:text-foreground sm:px-4 sm:py-2 sm:text-sm"
        >
          Войти
        </Link>
        <Link
          href="/sign-up"
          className="shrink-0 whitespace-nowrap rounded-full bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 sm:px-5 sm:py-2 sm:text-sm"
        >
          Регистрация
        </Link>
      </div>
    )
  }

  const isAdmin = (session.user as { role?: string }).role === "admin"

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link
          href="/admin"
          className="hidden rounded-full px-3 py-2 text-sm font-semibold text-gold transition-colors hover:text-gold/80 sm:block"
        >
          Админка
        </Link>
      )}
      <Link
        href="/cabinet"
        className="flex items-center gap-2 rounded-full bg-foreground/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/15"
      >
        <UserMark className="size-4" />
        <span className="max-w-24 truncate">{session.user.name || "Кабинет"}</span>
      </Link>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut()
          router.push("/")
          router.refresh()
        }}
        className="grid size-9 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
        aria-label="Выйти"
      >
        <LogoutMark className="size-4" />
      </button>
    </div>
  )
}
