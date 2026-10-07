"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type GhostInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  /** Grey text rendered right after the typed value: the rest of a format example or a word completion. */
  ghost?: string
  /** Word completions can be accepted with Tab / → or the chip below; format examples are only a hint. */
  acceptable?: boolean
}

export function GhostInput({ value, onValueChange, ghost = "", acceptable = false, className, onKeyDown, ...props }: GhostInputProps) {
  const accept = () => onValueChange(value + ghost)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented || !acceptable || !ghost) return
    const atEnd = e.currentTarget.selectionStart === value.length
    if ((e.key === "Tab" && !e.shiftKey) || (e.key === "ArrowRight" && atEnd)) {
      e.preventDefault()
      accept()
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="group relative isolate min-w-0">
        {/* The field background lives on this layer so the grey ghost text can sit between it and the transparent input. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 flex items-center overflow-hidden whitespace-pre rounded-2xl border border-transparent bg-muted px-4 text-[17px] transition-colors group-focus-within:bg-card",
            className,
          )}
        >
          <span className="invisible">{value}</span>
          <span className="text-muted-foreground/55">{ghost}</span>
        </div>
        <Input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn("bg-transparent hover:bg-transparent focus-visible:bg-transparent", className)}
          {...props}
        />
      </div>
      {acceptable && ghost && (
        <button
          type="button"
          onClick={accept}
          className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          {`Подставить «${(value + ghost).split(/[\s,]+/).pop()}»`}
        </button>
      )}
    </div>
  )
}

/** Rest of a fixed-format example after what the player typed, e.g. "MP12" + "34567". */
export function exampleTail(value: string, example: string) {
  return value.length < example.length ? example.slice(value.length) : ""
}
