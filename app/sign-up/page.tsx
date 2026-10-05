import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AuthForm } from "@/components/auth-form"
import { WELCOME_BONUS } from "@/lib/lottery"

export const metadata = {
  title: `Регистрация и бонус ${WELCOME_BONUS} BYN — bytoloto.com`,
  description: `Зарегистрируйтесь на bytoloto.com за минуту и получите ${WELCOME_BONUS} бонусных BYN на моментальные лотереи, скретч-билеты и Plinko.`,
  alternates: { canonical: "/sign-up" },
}

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  if (session?.user) redirect("/cabinet")
  return <AuthForm mode="sign-up" />
}
