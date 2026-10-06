import Link from "next/link"
import { BrandCoin } from "@/components/brand-coin"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  className?: string
  /** Where the mark links to. */
  href?: string
  /** Accessible name of the link. */
  label?: string
  /** Namespace for SVG gradient ids when several marks share a page. */
  id?: string
}

/**
 * Wordmark "bytoloto": a small "by" prefix, bold letters and three gold coins
 * in place of the "o"s that flip one after another. Scale it with font-size.
 */
export function BrandLogo({ className, href = "/", label = "bytoloto.com — на главную", id = "logo" }: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-baseline font-display font-black uppercase leading-none tracking-tight text-accent",
        className,
      )}
    >
      <span aria-hidden="true" className="flex items-baseline">
        <span className="mr-[0.12em] text-[0.55em] text-primary">by</span>
        <span>t</span>
        <BrandCoin uid={`${id}-1`} delay={0} />
        <span>l</span>
        <BrandCoin uid={`${id}-2`} delay={0.7} />
        <span>t</span>
        <BrandCoin uid={`${id}-3`} delay={1.4} />
      </span>
    </Link>
  )
}
