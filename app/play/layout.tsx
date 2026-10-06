import type { Metadata } from "next"
import { AccountShell } from "@/components/account/account-shell"

export const metadata: Metadata = {
  title: "Игры — bytoloto.com",
  robots: { index: false, follow: false },
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell>
      {children}
    </AccountShell>
  )
}
