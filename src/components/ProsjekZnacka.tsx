import { mjestoPrikaz } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Nekretnina } from '@/types/podaci'

/** €/m² vs the place average: green below −5 %, red above +5 %. */
export function ProsjekZnacka({ n }: { n: Nekretnina }) {
  const v = n.vs_prosjek
  if (v == null) return null
  const oko = v > -5 && v < 5
  return (
    <span
      title={oko ? undefined : `€/m² u odnosu na prosjek za ${mjestoPrikaz(n) || ''}`}
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        oko
          ? 'bg-muted text-muted-foreground'
          : v < 0
            ? 'bg-good-soft text-good'
            : 'bg-bad-soft text-bad',
      )}
    >
      {oko ? 'oko prosjeka' : `${v < 0 ? '' : '+'}${v} % od prosjeka`}
    </span>
  )
}
