"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"
import { track } from "@/lib/analytics"
import { User as UserMark, LogOut as LogoutMark } from "lucide-react"

export function HeaderAuthNav() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="h-9 w-24 rounded-full bg-foreground/10 animate-pulse" aria-hidden />
  }

  if (!session?.user) {
    return (
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link
          href="/sign-in"
          className="rounded-full px-2.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground sm:px-4"
        >
          Войти
        </Link>
        <Link
          href="/sign-up?from=header"
          onClick={() => track("header_signup_click")}
          className="whitespace-nowrap rounded-full bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-transform hover:scale-105 sm:px-5"
        >
          Регистрация
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <Link
        href="/cabinet"
        className="flex min-w-0 items-center gap-2 rounded-full bg-foreground/10 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/15 sm:px-4"
      >
        <UserMark className="size-4 shrink-0" />
        <span className="max-w-20 truncate sm:max-w-32">{session.user.name || "Кабинет"}</span>
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
