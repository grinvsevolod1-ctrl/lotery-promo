import type { Metadata } from "next"
import { AccountShell } from "@/components/account/account-shell"

export const metadata: Metadata = {
  title: "Личный кабинет — bytoloto.com",
  robots: { index: false, follow: false },
}

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell>
      {children}
    </AccountShell>
  )
}
