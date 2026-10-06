import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

function pageList(page: number, pages: number): (number | "gap")[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap")
    out.push(p)
  })
  return out
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null
  const arrow = "flex size-10 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border transition hover:ring-primary/40"

  return (
    <nav aria-label="Страницы" className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={arrow} aria-label="Предыдущая страница">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-40")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pageList(page, pages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground" aria-hidden>
            {"…"}
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex size-10 items-center justify-center rounded-full text-sm font-bold tabular-nums ring-1 transition",
              p === page ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border hover:ring-primary/40",
            )}
          >
            {p}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={arrow} aria-label="Следующая страница">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  )
}
