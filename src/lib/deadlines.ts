/** Auction and tender deadlines, and their .ics export. */

import { VRSTE } from '@/lib/constants'
import { dana, eur, mjestoPrikaz } from '@/lib/format'
import type { Nekretnina } from '@/types/podaci'

type ZaRok = Pick<Nekretnina, 'rok'>

/** True when the deadline carries a time of day (not midnight). */
function imaSat(rok: string): boolean {
  return rok.length > 10 && rok.slice(11, 16) !== '00:00'
}

/** The deadline as a local Date; a date without a time means the end of that day (23:59). */
export function rokDatum(n: ZaRok): Date | null {
  if (!n.rok || !/^\d{4}-\d\d-\d\d/.test(n.rok)) return null
  const d = new Date(imaSat(n.rok) ? n.rok.replace(' ', 'T') : n.rok.slice(0, 10) + 'T23:59')
  return Number.isNaN(d.getTime()) ? null : d
}

/** Calendar days until the deadline (0 = today), -1 once it has passed, null without one. */
export function danaDoRoka(n: ZaRok, now: number): number | null {
  const d = rokDatum(n)
  if (!d) return null
  if (d.getTime() < now) return -1
  const danas = new Date(now)
  danas.setHours(0, 0, 0, 0)
  const dan = new Date(d)
  dan.setHours(0, 0, 0, 0)
  return Math.round((dan.getTime() - danas.getTime()) / 86_400_000)
}

/** "rok za 5 dana (12. 11. u 10:00) · jamčevina 5.000 €" ("rok za 21 dan"), or '' without a future deadline. */
export function rokTekst(n: Pick<Nekretnina, 'rok' | 'jamcevina'>, now: number): string {
  const d = danaDoRoka(n, now)
  const r = rokDatum(n)
  if (d == null || d < 0 || !r) return ''
  const kad = d === 0 ? 'rok danas' : d === 1 ? 'rok sutra' : `rok za ${d} ${dana(d)}`
  const datum =
    `${r.getDate()}. ${r.getMonth() + 1}.` + (imaSat(n.rok) ? ` u ${n.rok.slice(11, 16)}` : '')
  return `${kad} (${datum})` + (n.jamcevina ? ` · jamčevina ${eur(n.jamcevina)}` : '')
}

export function poRoku(a: ZaRok, b: ZaRok): number {
  return (rokDatum(a)?.getTime() || 0) - (rokDatum(b)?.getTime() || 0)
}

/** Active with a deadline within the next 7 days. Rejected listings are the caller's to drop. */
export function rokUskoro(n: Pick<Nekretnina, 'rok' | 'aktivan'>, now: number): boolean {
  const d = danaDoRoka(n, now)
  return n.aktivan && d != null && d >= 0 && d <= 7
}

function escIcs(t: string): string {
  return t.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
}

function dt(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0')
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    'T' +
    p(d.getHours()) +
    p(d.getMinutes()) +
    '00'
  )
}

/**
 * RFC 5545 line folding: lines over 75 octets continue on the next line after a space. Folds every
 * 60 characters, as the old site did; that stays under 75 bytes unless more than about a quarter of
 * a line is non-ASCII, which Croatian text never reaches in practice.
 */
export function presavij(red: string): string {
  const dijelovi: string[] = []
  let r = red
  while (r.length > 60) {
    dijelovi.push(r.slice(0, 60))
    r = ' ' + r.slice(60)
  }
  dijelovi.push(r)
  return dijelovi.join('\r\n')
}

type ZaIcs = Pick<
  Nekretnina,
  | 'id'
  | 'rok'
  | 'nacin'
  | 'vrsta'
  | 'opcina'
  | 'kvart'
  | 'naselje'
  | 'cijena'
  | 'jamcevina'
  | 'naslov'
  | 'url'
>

/** Calendar file with one 30-minute event per deadline, reminders 2 days and 2 hours before. */
export function ics(lista: readonly ZaIcs[], link: (id: string) => string, now: number): string {
  const redovi = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nekretnine-osijek//rokovi//HR',
    'CALSCALE:GREGORIAN',
  ]
  for (const n of lista) {
    const r = rokDatum(n)
    if (!r) continue
    const naslov =
      (n.nacin === 'drazba' ? 'Dražba' : n.nacin === 'natjecaj' ? 'Natječaj' : 'Rok') +
      ': ' +
      (VRSTE[n.vrsta] || 'nekretnina') +
      ', ' +
      (mjestoPrikaz(n) || n.opcina || '')
    const l = link(n.id)
    const opis = [
      eur(n.cijena) || 'cijena na upit',
      n.jamcevina ? 'jamčevina ' + eur(n.jamcevina) : '',
      n.naslov,
      'Izvor: ' + n.url,
      'Pregled: ' + l,
    ]
      .filter(Boolean)
      .join('\n')
    redovi.push(
      'BEGIN:VEVENT',
      `UID:rok-${n.id}-${n.rok.replace(/\D/g, '')}@nekretnine-osijek`,
      'DTSTAMP:' + dt(new Date(now)),
      'DTSTART:' + dt(r),
      'DTEND:' + dt(new Date(r.getTime() + 30 * 60_000)),
      'SUMMARY:' + escIcs(naslov),
      'DESCRIPTION:' + escIcs(opis),
      'URL:' + l,
      'BEGIN:VALARM',
      'TRIGGER:-P2D',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + escIcs(naslov),
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + escIcs(naslov),
      'END:VALARM',
      'END:VEVENT',
    )
  }
  redovi.push('END:VCALENDAR')
  return redovi.map(presavij).join('\r\n')
}
