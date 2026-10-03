import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { CabinetHeader } from "@/components/cabinet/cabinet-header"

export const metadata: Metadata = {
  title: "Личный кабинет — lotery.by",
  robots: { index: false, follow: false },
}

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 py-6 sm:py-8">
        <CabinetHeader />
        <main>{children}</main>
      </div>
    </div>
  )
}
