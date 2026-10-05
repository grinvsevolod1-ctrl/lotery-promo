import type { ReactNode } from "react"

export function PageHeading({ eyebrow, title, description, aside }: { eyebrow?: string; title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground text-balance sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {aside}
    </div>
  )
}
