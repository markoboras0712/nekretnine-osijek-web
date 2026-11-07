import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A toggle chip; `broj` is how many listings you would see with it toggled. */
export function Cip({
  pritisnut,
  broj,
  onClick,
  title,
  className,
  children,
}: {
  pritisnut: boolean
  broj?: number | null
  onClick: () => void
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pritisnut}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground',
        broj === 0 && !pritisnut && 'opacity-45',
        className,
      )}
    >
      {children}
      {broj != null && <span className="text-xs tabular-nums opacity-70">{broj}</span>}
    </button>
  )
}
