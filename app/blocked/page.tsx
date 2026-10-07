import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { auth } from "@/lib/auth"
import { getUserBlock } from "@/lib/user-block"
import { site } from "@/lib/site"

export const metadata = { title: "Аккаунт заблокирован — bytoloto.com", robots: { index: false, follow: false } }

export default async function BlockedPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const block = await getUserBlock(session.user.id)
  if (!block) redirect("/cabinet")

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Аккаунт заблокирован</h1>
        {block.reason && (
          <p className="text-pretty text-sm leading-relaxed text-foreground">
            Причина: <span className="font-semibold">{block.reason}</span>
          </p>
        )}
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Если вы считаете, что это ошибка, свяжитесь со службой поддержки.
        </p>
        <a href={`mailto:${site.operator.email}`} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          Написать в поддержку
        </a>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          На главную
        </Link>
      </div>
    </main>
  )
}
