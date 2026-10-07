import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { VerifyEmailResend } from "@/components/verify-email-resend"

export const metadata = { title: "Подтверждение e-mail — bytoloto.com", robots: { index: false, follow: false } }

// Better Auth redirects here after following the link from the letter.
// No interstitial: a valid link goes straight to the cabinet.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/cabinet")

  const { error } = await searchParams
  if (error) return <VerifyEmailResend />

  redirect("/sign-in")
}
