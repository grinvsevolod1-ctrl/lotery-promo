import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AuthForm } from "@/components/auth-form"

export const metadata = {
  title: "Вход в личный кабинет — bytoloto.com",
  description: "Войдите в личный кабинет bytoloto.com, чтобы купить билет моментальной лотереи, крутить колесо удачи и следить за выигрышами.",
  alternates: { canonical: "/sign-in" },
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  if (session?.user) redirect("/cabinet")

  const { reset } = await searchParams

  return (
    <AuthForm
      mode="sign-in"
      notice={reset ? "Пароль изменён. Войдите с новым паролем." : undefined}
    />
  )
}
