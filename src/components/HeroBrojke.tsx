'use client'

import { useEffect, useState } from 'react'
import { usePodaci } from '@/hooks/use-podaci'
import { brojIzvoraUkupno } from '@/lib/data'
import { prijeKratko } from '@/lib/format'

/** Live stats in the hero: active listings, sources, freshness. */
export function HeroBrojke() {
  const s = usePodaci()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const osvjezi = () => setNow(Date.now())
    const prvi = setTimeout(osvjezi, 0)
    const t = setInterval(osvjezi, 60_000)
    return () => {
      clearTimeout(prvi)
      clearInterval(t)
    }
  }, [])
  const p = s.status === 'ok' ? s.podaci : null
  const brojke: [string, string][] = [
    [p ? p.nekretnine.filter((n) => n.aktivan).length.toLocaleString('hr-HR') : '–', 'nekretnina'],
    [p ? String(brojIzvoraUkupno(p)) : '–', 'izvora'],
    [p && now ? prijeKratko(p.generirano, now) : '–', 'osvježeno'],
  ]
  return (
    <div aria-live="polite" className="grid grid-cols-[repeat(3,minmax(0,max-content))] gap-2.5">
      {brojke.map(([b, t]) => (
        <div
          key={t}
          className="rounded-xl border border-white/15 bg-white/8 px-2.5 py-1.5 backdrop-blur-sm sm:px-3.5 sm:py-2"
        >
          <b className="block text-[1.05rem] text-white tabular-nums sm:text-xl">{b}</b>
          <span className="text-xs text-[#b9d9cc]">{t}</span>
        </div>
      ))}
    </div>
  )
}
