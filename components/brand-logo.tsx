import Link from 'next/link'
import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="bytoloto.com — на главную"
      className={cn('flex shrink-0 items-baseline font-display font-black uppercase leading-none tracking-tight', className)}
    >
      <span className="mr-0.5 text-[0.55em] text-accent">by</span>
      <span className="text-primary">to</span>
      <span className="text-primary">!</span>
      <span className="text-accent">loto</span>
    </Link>
  )
}
