import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth-shell"

export const metadata = { title: "Подтверждение e-mail — bytoloto.com", robots: { index: false, follow: false } }
import { VerifyEmailResend } from "@/components/verify-email-resend"

// Better Auth redirects here after following the link from the letter:
// on success the user is already signed in, on failure `?error=` is set.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/cabinet")

  const { error } = await searchParams
  if (error) return <VerifyEmailResend />

  return (
    <AuthShell title="E-mail подтверждён" subtitle="Аккаунт активирован. Теперь вы можете войти в кабинет.">
      <Button
        render={<Link href="/sign-in" />}
        size="lg"
        className="cta-shine w-full text-base font-bold"
      >
        Войти
      </Button>
    </AuthShell>
  )
}
