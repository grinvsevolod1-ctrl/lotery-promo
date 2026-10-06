"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { WELCOME_BONUS } from "@/lib/lottery"

export function StickySignup() {
  const { data: session, isPending } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [footerInView, setFooterInView] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 520)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Step aside once the footer scrolls in so its links and legal text stay readable.
  useEffect(() => {
    const footer = document.querySelector("footer")
    if (!footer) return
    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting))
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  if (isPending || session?.user) return null

  const visible = scrolled && !footerInView

  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-40 transition duration-300 sm:inset-x-auto sm:right-5 sm:w-96 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-foreground p-3 pl-4 text-background shadow-2xl shadow-foreground/40 ring-1 ring-primary/40">
        <p className="min-w-0 flex-1 text-sm leading-tight">
          <span className="block font-display text-lg font-black text-primary">{WELCOME_BONUS} BYN</span>
          ждут вас на балансе
        </p>
        <Link
          href="/sign-up"
          className="inline-flex h-12 shrink-0 items-center rounded-xl bg-primary px-5 text-sm font-extrabold uppercase text-primary-foreground transition hover:brightness-110 active:scale-95"
        >
          Забрать
        </Link>
      </div>
    </div>
  )
}
