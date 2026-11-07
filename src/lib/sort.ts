/** Sort options, the comparator, and the sorted-by value highlighted on each card. */

import { brojIzvora, danaNaTrzistu, dana, eur, m2, prije, vrijeme, zarez } from '@/lib/format'
import type { MojaOcjena } from '@/lib/wishes'
import type { Nekretnina } from '@/types/podaci'

export type SortKey =
  | 'relevantno'
  | 'moje'
  | 'ocjena'
  | 'datum'
  | 'cijena'
  | 'm2'
  | 'prosjek'
  | 'povrsina'
  | 'zemljiste'
  | 'sobe'
  | 'pad'
  | 'izvori'

export type SortKontekst = {
  rezultat: Map<string, number> | null
  moja: (n: Nekretnina) => MojaOcjena
  now: number
}

type Definicija = {
  naziv: string
  /** default direction: 1 ascending, -1 descending */
  smjer: 1 | -1
  v: (n: Nekretnina, ctx: SortKontekst) => number | null | undefined
  /** direction labels: [ascending, descending]; none = no direction toggle */
  t?: [string, string]
}

export const SORTOVI: Record<SortKey, Definicija> = {
  relevantno: { naziv: 'Najrelevantnije', smjer: -1, v: (n, c) => c.rezultat?.get(n.id) },
  moje: {
    naziv: 'Po mojim željama',
    smjer: -1,
    v: (n, c) => c.moja(n).ocjena,
    t: ['najmanje odgovara prvo', 'najviše odgovara prvo'],
  },
  ocjena: {
    naziv: 'Najbolja ponuda',
    smjer: -1,
    v: (n) => n.ocjena,
    t: ['najslabije prvo', 'najbolje prvo'],
  },
  datum: {
    naziv: 'Datum objave',
    smjer: -1,
    v: (n) => vrijeme(n.od),
    t: ['najstarije prvo', 'najnovije prvo'],
  },
  cijena: {
    naziv: 'Cijena',
    smjer: 1,
    v: (n) => n.cijena,
    t: ['najjeftinije prvo', 'najskuplje prvo'],
  },
  m2: {
    naziv: 'Cijena po m²',
    smjer: 1,
    v: (n) => n.eur_m2,
    t: ['najniža prvo', 'najviša prvo'],
  },
  prosjek: {
    naziv: 'Odnos prema prosjeku',
    smjer: 1,
    v: (n) => n.vs_prosjek,
    t: ['najviše ispod prosjeka', 'najviše iznad prosjeka'],
  },
  povrsina: {
    naziv: 'Površina',
    smjer: -1,
    v: (n) => (n.vrsta === 'zemljiste' ? null : n.povrsina),
    t: ['najmanja prvo', 'najveća prvo'],
  },
  zemljiste: {
    naziv: 'Okućnica / zemljište',
    smjer: -1,
    v: (n) => n.zemljiste,
    t: ['najmanje prvo', 'najveće prvo'],
  },
  sobe: {
    naziv: 'Broj soba',
    smjer: -1,
    v: (n) => n.sobe,
    t: ['najmanje soba prvo', 'najviše soba prvo'],
  },
  pad: {
    naziv: 'Pad cijene (30 dana)',
    smjer: -1,
    v: (n) => (n.pad ? n.pad.posto : null),
    t: ['najmanji pad prvo', 'najveći pad prvo'],
  },
  izvori: {
    naziv: 'Broj izvora',
    smjer: -1,
    v: (n) => brojIzvora(n),
    t: ['najmanje izvora prvo', 'najviše izvora prvo'],
  },
}

/** Order in the select. */
export const REDOSLIJED_SORTA: SortKey[] = [
  'relevantno',
  'moje',
  'ocjena',
  'datum',
  'cijena',
  'm2',
  'prosjek',
  'povrsina',
  'zemljiste',
  'sobe',
  'pad',
  'izvori',
]

export function jeSort(v: unknown): v is SortKey {
  return typeof v === 'string' && Object.hasOwn(SORTOVI, v)
}

export function smjerSorta(sort: SortKey, smjer: number): 1 | -1 {
  return smjer > 0 ? 1 : smjer < 0 ? -1 : SORTOVI[sort].smjer
}

/** Clicking the direction toggle flips it; back to the default direction is stored as 0. */
export function obrniSmjer(sort: SortKey, smjer: number): number {
  const novi = -smjerSorta(sort, smjer)
  return novi === SORTOVI[sort].smjer ? 0 : novi
}

/** "↓ najbolje prvo", or null for a sort without directions. */
export function tekstSmjera(sort: SortKey, smjer: number): string | null {
  const t = SORTOVI[sort].t
  if (!t) return null
  return smjerSorta(sort, smjer) > 0 ? t[0] : t[1]
}

/** Listings without the value always go last (both directions); ties: higher ocjena, then newer. */
export function usporedba(sort: SortKey, smjer: number, ctx: SortKontekst) {
  const s = SORTOVI[sort]
  const sm = smjerSorta(sort, smjer)
  return (a: Nekretnina, b: Nekretnina): number => {
    const x = s.v(a, ctx)
    const y = s.v(b, ctx)
    const nx = x == null || Number.isNaN(x)
    const ny = y == null || Number.isNaN(y)
    if (nx || ny) {
      if (nx !== ny) return nx ? 1 : -1
    } else if (x !== y) {
      return (x - y) * sm
    }
    return b.ocjena - a.ocjena || (vrijeme(b.od) || 0) - (vrijeme(a.od) || 0)
  }
}

export type Istaknuto = { tekst: string; dobro?: boolean }

/** The sorted-by value shown on the card ("na tržištu 81 dan", "odgovara ti 93 % · …"). */
export function istaknuto(
  n: Nekretnina,
  sort: SortKey,
  smjer: number,
  ctx: SortKontekst,
): Istaknuto | null {
  switch (sort) {
    case 'pad':
      return n.pad
        ? {
            tekst: `−${eur(n.pad.eur)} (−${zarez(n.pad.posto)} %) ${prije(n.pad.datum, ctx.now)}`,
            dobro: true,
          }
        : null
    case 'datum': {
      if (smjerSorta(sort, smjer) < 0) return null
      const d = danaNaTrzistu(n, ctx.now)
      return d != null ? { tekst: `na tržištu ${d} ${dana(d)}` } : null
    }
    case 'zemljiste':
      return n.zemljiste ? { tekst: 'zemljište ' + m2(n.zemljiste) } : null
    case 'povrsina':
      return n.povrsina ? { tekst: 'površina ' + m2(n.povrsina) } : null
    case 'moje': {
      const m = ctx.moja(n)
      return {
        tekst:
          `odgovara ti ${m.ocjena} %` +
          (m.zasto.length ? ' · ' + m.zasto.slice(0, 3).join(', ') : ''),
        dobro: m.ocjena >= 60,
      }
    }
    case 'izvori': {
      const b = brojIzvora(n)
      return { tekst: `na ${b} ${b === 1 ? 'izvoru' : 'izvora'}` }
    }
    default:
      return n.pad && n.pad.posto >= 3
        ? { tekst: `cijena pala ${zarez(n.pad.posto)} %`, dobro: true }
        : null
  }
}
