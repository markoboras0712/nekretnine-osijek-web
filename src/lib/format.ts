import type { Nekretnina } from '@/types/podaci'

const DAN = 86_400_000

/** 120000 -> "120.000 €"; null -> "". */
export function eur(v: number | null | undefined): string {
  return v == null ? '' : Math.round(v).toLocaleString('hr-HR') + ' €'
}

/** Thousands separators only: 120000 -> "120.000". */
export function tis(v: number | string): string {
  return (+v).toLocaleString('hr-HR')
}

/** 88 -> "88 m²"; 0/null -> "". */
export function m2(v: number | null | undefined): string {
  return v ? Math.round(v).toLocaleString('hr-HR') + ' m²' : ''
}

/** Decimal comma: 3.2 -> "3,2". */
export function zarez(v: number): string {
  return String(v).replace('.', ',')
}

/** "YYYY-MM-DD HH:MM[:SS]" (local time) -> epoch ms; '' -> null. */
export function vrijeme(ts: string | null | undefined): number | null {
  if (!ts) return null
  const t = new Date(ts.replace(' ', 'T')).getTime()
  return Number.isNaN(t) ? null : t
}

/** "danas", "jučer", "prije 3 dana", "prije 2 tj.", "prije 4 mj.". */
export function prije(ts: string | null | undefined, now: number): string {
  const t = vrijeme(ts)
  if (t == null) return ''
  const d = Math.floor((now - t) / DAN)
  if (d <= 0) return 'danas'
  if (d === 1) return 'jučer'
  if (d < 14) return `prije ${d} dana`
  if (d < 60) return `prije ${Math.floor(d / 7)} tj.`
  return `prije ${Math.floor(d / 30)} mj.`
}

/** Freshness: "upravo", "prije 12 min", "prije 3 h", then like prije(). */
export function prijeKratko(ts: string | null | undefined, now: number): string {
  const t = vrijeme(ts)
  if (t == null) return ''
  const min = Math.round((now - t) / 60_000)
  if (min < 2) return 'upravo'
  if (min < 60) return `prije ${min} min`
  if (min < 1440) return `prije ${Math.round(min / 60)} h`
  return prije(ts, now)
}

/** 1 -> "1 soba", 3 -> "3 sobe", 2.5 -> "2,5 soba", 5 -> "5 soba". */
export function sobeTekst(s: number | null): string {
  if (!s) return ''
  return zarez(s) + (s === 1 ? ' soba' : s < 5 && s % 1 === 0 ? ' sobe' : ' soba')
}

/** Floor text for flats only: "suteren", "prizemlje", "3. kat (zadnji)". */
export function katTekst(n: Pick<Nekretnina, 'vrsta' | 'kat' | 'zadnji_kat'>): string {
  if (n.vrsta !== 'stan') return ''
  if (n.kat == null) return n.zadnji_kat ? 'zadnji kat' : ''
  const t = n.kat < 0 ? 'suteren' : n.kat === 0 ? 'prizemlje' : `${n.kat}. kat`
  return t + (n.zadnji_kat && n.kat > 0 ? ' (zadnji)' : '')
}

/** The place key used by filters and the map: Osijek kvart ('' if unknown), else naselje. */
export function mjesto(n: Pick<Nekretnina, 'opcina' | 'kvart' | 'naselje'>): string {
  return n.opcina === 'Osijek' ? n.kvart || '' : n.naselje || ''
}

/** Display place: kvart for Osijek when known, else naselje. */
export function mjestoPrikaz(n: Pick<Nekretnina, 'opcina' | 'kvart' | 'naselje'>): string {
  return n.opcina === 'Osijek' && n.kvart ? n.kvart : n.naselje
}

/** "2026-10-05" -> "5.10.2026." as in the old site (day.month.year). */
export function datumHr(d: string): string {
  return d.split('-').reverse().join('.') + '.'
}

/** Days since first seen, or null. */
export function danaNaTrzistu(n: Pick<Nekretnina, 'od'>, now: number): number | null {
  const t = vrijeme(n.od)
  return t == null ? null : Math.floor((now - t) / DAN)
}

/** Unique source names, in order. */
export function naziviIzvora(n: Pick<Nekretnina, 'izvori'>): string[] {
  return [...new Set(n.izvori.map((i) => i.naziv))]
}

export function brojIzvora(n: Pick<Nekretnina, 'izvori'>): number {
  return naziviIzvora(n).length
}

/** Co-ownership share ('udio' or the uncertain 'udio?'). */
export function jeUdio(n: Pick<Nekretnina, 'predmet'>): boolean {
  return (n.predmet || '').startsWith('udio')
}

/** "1 dan", "21 dan", "5 dana", "11 dana". */
export function dana(d: number): string {
  return d % 10 === 1 && d % 100 !== 11 ? 'dan' : 'dana'
}
