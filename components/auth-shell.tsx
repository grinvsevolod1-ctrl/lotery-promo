import type { ReactNode } from "react"
import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative flex min-h-svh flex-col items-center bg-background px-4 pb-12 pt-10 sm:justify-center sm:py-16">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-50" aria-hidden />

      <div className="relative flex w-full max-w-[440px] flex-col items-center apple-rise">
        <BrandLogo id="auth" className="mb-8 text-4xl sm:text-5xl" />

        <div className="w-full rounded-[28px] bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-border/50 sm:p-9">
          <div className="mb-7 text-center">
            <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-foreground text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">{subtitle}</p>
            )}
          </div>

          {children}

          {footer && (
            <p className="mt-7 text-center text-[15px] text-muted-foreground">{footer}</p>
          )}
        </div>

        <Link
          href="/"
          className="mt-6 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          &larr; На главную
        </Link>
      </div>
    </main>
  )
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "success"
  children: ReactNode
}) {
  const styles =
    tone === "error"
      ? "bg-destructive/10 text-destructive"
      : "bg-gold/10 text-gold"
  return (
    <p
      className={`rounded-2xl px-4 py-3 text-sm text-pretty apple-rise ${styles}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  )
}
