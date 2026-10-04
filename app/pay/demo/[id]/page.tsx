import { notFound } from "next/navigation"

export const metadata = { title: "Страница недоступна — ToLoto", robots: { index: false, follow: false } }

export default function RetiredPaymentPage() {
  notFound()
}
