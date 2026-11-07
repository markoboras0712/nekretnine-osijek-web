import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The green gradient band with a rooftop skyline, shared by the list and the about page. */
export function Hero({
  children,
  mali,
  labelledBy,
}: {
  children: ReactNode
  mali?: boolean
  labelledBy: string
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        'relative overflow-hidden px-4 pt-[max(28px,env(safe-area-inset-top))] text-[#f3f7f4]',
        mali ? 'pb-7' : 'pb-8',
      )}
      style={{
        background:
          'radial-gradient(120% 140% at 85% -10%, #3c9a7f 0%, rgba(60,154,127,0) 55%), radial-gradient(90% 120% at 0% 110%, #0d3a30 0%, rgba(13,58,48,0) 60%), linear-gradient(160deg, #17594a 0%, #10433a 60%, #0c3029 100%)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[150px]">
        <svg
          viewBox="0 0 1200 260"
          preserveAspectRatio="xMidYMax slice"
          className="block size-full fill-white/6"
        >
          <path d="M0 260V196l60-36 60 36v-28l44-30 44 30v58l70-52 70 52v-40l50-34 50 34v-22l80-58 80 58v46l46-32 46 32v-30l66-46 66 46v14l54-38 54 38v-48l70-50 70 50v30l40-28 40 28v66z" />
        </svg>
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-3.5">{children}</div>
    </section>
  )
}
