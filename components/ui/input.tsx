import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/**
 * Shared field look so raw <input>/<textarea> elements match <Input>.
 * 16px+ text keeps iOS Safari from zooming on focus.
 */
export const fieldClass =
  "h-13 w-full min-w-0 rounded-2xl border border-transparent bg-muted px-4 text-[17px] text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] placeholder:text-muted-foreground/70 hover:bg-muted/70 focus-visible:border-primary focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 motion-reduce:transition-none"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
