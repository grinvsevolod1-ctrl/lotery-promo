import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDemoDeposit } from "@/app/actions/funding"
import { DemoPayment } from "@/components/pay/demo-payment"

export const metadata = { title: "Тестовое пополнение — ToLoto", robots: { index: false, follow: false } }

export default async function DemoPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const { id } = await params
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound()
  const request = await getDemoDeposit(Number(id))
  if (!request) notFound()
  return <DemoPayment initial={request} />
}
