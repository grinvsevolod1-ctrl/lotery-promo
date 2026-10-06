import type { Metadata } from "next"
import { AccountShell } from "@/components/account/account-shell"
import { LuckBanner } from "@/components/luck-banner"

export const metadata: Metadata = {
  title: "Игры — bytoloto.com",
  robots: { index: false, follow: false },
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell>
      <LuckBanner />
      {children}
    </AccountShell>
  )
}
