import type { Metadata } from "next"
import { getSessionUser } from "@/lib/session"
import { getMyVerification } from "@/app/actions/verification"
import { ProfileTabs } from "@/components/cabinet/profile-tabs"
import { VerificationView } from "@/components/cabinet/verification-view"

export const metadata: Metadata = {
  title: "Верификация — bytoloto.com",
  robots: { index: false, follow: false },
}

export default async function VerificationPage() {
  const current = await getSessionUser()
  const data = await getMyVerification(current.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Профиль</h1>
        <p className="text-sm text-muted-foreground">Подтверждение личности для вывода выигрышей</p>
      </div>
      <ProfileTabs active="verification" status={data?.status ?? "none"} />
      <VerificationView data={data} accountName={current.name} />
    </div>
  )
}
