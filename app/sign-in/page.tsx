import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/cabinet")

  const { reset } = await searchParams

  return (
    <AuthForm
      mode="sign-in"
      notice={reset ? "Пароль изменён. Войдите с новым паролем." : undefined}
    />
  )
}
