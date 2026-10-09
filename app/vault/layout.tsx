import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Хранилище",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
