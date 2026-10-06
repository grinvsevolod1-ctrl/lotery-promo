"use client"

import { setFeedbackEnabled, useFeedbackEnabled } from "@/lib/feedback"
import { cn } from "@/lib/utils"

export function SoundToggle({ className }: { className?: string }) {
  const enabled = useFeedbackEnabled()
  return (
    <button
      type="button"
      onClick={() => setFeedbackEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? "Выключить звук и вибрацию" : "Включить звук и вибрацию"}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-card text-foreground ring-1 ring-border transition hover:text-primary active:scale-95",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
        {enabled ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          <path d="m16 9 6 6m0-6-6 6" />
        )}
      </svg>
    </button>
  )
}
