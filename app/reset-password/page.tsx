import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth-shell"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata = { title: "Новый пароль — bytoloto.com", robots: { index: false, follow: false } }

// Better Auth redirects here from the letter with `?token=` when the link is
// valid, or with `?error=INVALID_TOKEN` when it has expired or was used.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  if (!token || error) {
    return (
      <AuthShell
        title="Ссылка недействительна"
        subtitle="Ссылка для смены пароля устарела или уже использована. Запросите новую."
      >
        <Button
          render={<Link href="/forgot-password" />}
          size="lg"
          className="cta-shine w-full text-base font-bold"
        >
          Запросить новую ссылку
        </Button>
      </AuthShell>
    )
  }

  return <ResetPasswordForm token={token} />
}
