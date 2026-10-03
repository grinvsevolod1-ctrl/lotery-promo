import type { ReactNode } from "react"
import Link from "next/link"
import { CloverTicket } from "@/components/icons"

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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div className="pointer-events-none absolute inset-0 aura-bg opacity-60" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; На главную
        </Link>

        <div className="orbit-border rounded-3xl">
          <div className="grain relative rounded-3xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <CloverTicket className="size-7" />
              </span>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground text-balance">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm text-muted-foreground text-pretty">{subtitle}</p>
              )}
            </div>

            {children}

            {footer && (
              <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
            )}
          </div>
        </div>
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
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-gold/40 bg-gold/10 text-gold"
  return (
    <p
      className={`rounded-2xl border px-4 py-3 text-sm text-pretty ${styles}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  )
}
