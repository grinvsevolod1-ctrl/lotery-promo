import type { Metadata } from "next"
import { PaymentConfirmationDemo } from "@/components/payment-confirmation-demo"

export const metadata: Metadata = {
  title: "ДЕМО — подтверждение тестовой операции",
  description: "Презентационный макет. Не является банковской страницей и не выполняет платежи.",
  robots: { index: false, follow: false },
}

export default function DemoPaymentPage() {
  return <PaymentConfirmationDemo />
}
