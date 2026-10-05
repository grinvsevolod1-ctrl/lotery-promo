import Link from "next/link"
import { ArrowLeftMark as ArrowLeft } from "@/components/icons"

export function BackToGames() {
  return (
    <Link
      href="/play"
      className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-card px-4 text-sm font-bold text-foreground ring-1 ring-border transition hover:ring-primary/40 active:scale-[0.97]"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Все игры
    </Link>
  )
}
