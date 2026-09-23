import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { PhoneAuthForm } from "@/components/phone-auth-form"

export default async function SignInPage() {
  const user = await getCurrentUser()
  if (user) redirect("/cabinet")
  return <PhoneAuthForm mode="sign-in" />
}
