'use client'

import { useEffect, useState } from 'react'
import { usePodaci } from '@/hooks/use-podaci'
import { brojIzvoraUkupno } from '@/lib/data'
import { brojIzvora, prijeKratko } from '@/lib/format'
import { cn } from '@/lib/utils'

function useSada(): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0)
    return () => clearTimeout(t)
  }, [])
  return now
}

/** "svakih 15 min", "svakih 2 h", "dvaput dnevno", "jednom dnevno". */
export function ritam(m: number | null): string {
  if (!m) return ''
  if (m < 60) return `svakih ${m} min`
  if (m < 1440) {
    const h = Math.round(m / 60)
    return h === 12 ? 'dvaput dnevno' : `svakih ${h} h`
  }
  return 'jednom dnevno'
}

export function Brojke() {
  const s = usePodaci()
  const now = useSada()
  const p = s.status === 'ok' ? s.podaci : null
  const aktivne = p ? p.nekretnine.filter((n) => n.aktivan) : []
  const stat: [string, string][] = [
    [p ? aktivne.length.toLocaleString('hr-HR') : '–', 'aktivnih nekretnina'],
    [p ? String(brojIzvoraUkupno(p)) : '–', 'izvora koji se prate'],
    [
      p ? aktivne.filter((n) => brojIzvora(n) > 1).length.toLocaleString('hr-HR') : '–',
      'nekretnina na više izvora, spojeno u jednu',
    ],
    [p && now ? prijeKratko(p.generirano, now) : '–', 'zadnje osvježavanje'],
  ]
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
      {stat.map(([b, t]) => (
        <div key={t} className="rounded-2xl border bg-card px-3.5 py-3">
          <b className="block text-2xl tabular-nums">{b}</b>
          <span className="text-xs text-muted-foreground">{t}</span>
        </div>
      ))}
    </div>
  )
}

export function SkupineIzvora() {
  const s = usePodaci()
  if (s.status === 'ucitavam')
    return <p className="text-muted-foreground">Učitavam popis izvora…</p>
  if (s.status === 'greska') return <p>Popis izvora se trenutno ne može učitati.</p>
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
      {s.podaci.skupine_izvora.map((g) => (
        <div key={g.naziv} className="rounded-2xl border bg-card px-4 py-3.5 shadow-xs">
          <h3 className="font-semibold">{g.naziv}</h3>
          <p className="mb-2 text-sm text-muted-foreground">{g.kako}</p>
          {g.svakih_min ? (
            <span className="mb-2 inline-block rounded-full bg-good-soft px-2.5 py-0.5 text-xs text-good">
              {ritam(g.svakih_min)}
            </span>
          ) : null}
          <ul className="grid gap-1 text-sm">
            {g.izvori.map((i) => (
              <li key={i.naziv} className="flex items-center gap-2">
                <span
                  title={i.radi ? 'radi' : 'trenutno ne radi'}
                  className={cn('size-2 shrink-0 rounded-full', i.radi ? 'bg-good' : 'bg-bad')}
                />
                <span>
                  {i.naziv}
                  {i.radi ? '' : ' (trenutno ne radi)'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function Osvjezeno() {
  const s = usePodaci()
  if (s.status !== 'ok') return null
  return <p>Podaci osvježeni {s.podaci.generirano.slice(0, 16)}.</p>
}
