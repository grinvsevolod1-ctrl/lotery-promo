import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({ children, className, accent }: { children: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "grain relative overflow-hidden rounded-3xl border border-border/60 backdrop-blur-xl",
        accent ? "bg-gradient-to-br from-primary/20 to-accent/10" : "bg-card/70",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PanelTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2 className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold text-foreground sm:text-xl">
        {icon && <span className="text-gold">{icon}</span>}
        {children}
      </h2>
      {aside}
    </div>
  )
}

export function StatCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Panel accent={accent} className="p-5 sm:p-6">
      <span className={cn("mb-3 inline-flex rounded-xl p-2.5", accent ? "bg-primary/20 text-primary" : "bg-foreground/10 text-foreground/70")}>
        {icon}
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
    </Panel>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="grain relative rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

export function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const styles =
    tone === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-gold/40 bg-gold/10 text-gold"
  return (
    <p className={cn("rounded-2xl border px-4 py-3 text-sm text-pretty", styles)} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  )
}
