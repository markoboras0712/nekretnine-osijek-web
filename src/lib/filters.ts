/** Filter state, the filter predicates, views, and the live counts shown on filter chips. */

import {
  BRZO,
  CIJENE_BRZO,
  KAT,
  VRSTE,
  VRSTE_ZADANO,
  type Pogled,
  type Oznaka,
} from '@/lib/constants'
import { brojac } from '@/lib/data'
import { danaDoRoka } from '@/lib/deadlines'
import { jeUdio, mjesto, tis, vrijeme } from '@/lib/format'
import type { SortKey } from '@/lib/sort'
import type { Nekretnina, Vrsta } from '@/types/podaci'

export type Prikaz = 'popis' | 'karta'

export const BROJEVI = ['cmin', 'cmax', 'pmin', 'pmax', 'zmin', 'm2max'] as const
export type Broj = (typeof BROJEVI)[number]

export const LISTE = ['vrste', 'opcine', 'mjesta', 'sobe', 'kat', 'zn', 'brzo'] as const
export type Lista = (typeof LISTE)[number]

export type Stanje = {
  pogled: Pogled
  vrste: string[]
  opcine: string[]
  mjesta: string[]
  sobe: string[]
  kat: string[]
  zn: string[]
  brzo: string[]
  trazi: string
  sort: SortKey
  /** 0 = the sort's default direction; 1 ascending, -1 descending */
  smjer: number
  prikaz: Prikaz
} & Record<Broj, string>

export function prazno(): Stanje {
  return {
    pogled: 'sve',
    vrste: [...VRSTE_ZADANO],
    opcine: [],
    mjesta: [],
    sobe: [],
    kat: [],
    zn: [],
    brzo: [],
    trazi: '',
    sort: 'ocjena',
    smjer: 0,
    prikaz: 'popis',
    cmin: '',
    cmax: '',
    pmin: '',
    pmax: '',
    zmin: '',
    m2max: '',
  }
}

export function jeZadaneVrste(v: readonly string[]): boolean {
  return v.join() === VRSTE_ZADANO.join()
}

type N = Nekretnina

/** Room buckets for the 1 / 2 / 3 / 4+ chips. */
export function sobeKos(s: number | null): string | null {
  return s == null ? null : s < 1.75 ? '1' : s < 2.75 ? '2' : s < 3.75 ? '3' : '4'
}

export function katOk(n: Pick<N, 'kat'>, k: string): boolean {
  if (k === 'pr') return n.kat != null && n.kat <= 0
  if (k === 'nisko') return n.kat === 1 || n.kat === 2
  return n.kat != null && n.kat >= 3
}

export function brzoOk(n: N, k: string, now: number): boolean {
  switch (k) {
    case 'tjedan': {
      const t = vrijeme(n.od)
      return t != null && now - t < 7 * 86_400_000
    }
    case 'pad':
      return !!n.pad
    case 'ispod':
      return n.vs_prosjek != null && n.vs_prosjek <= -10
    case 'foto':
      return !!n.slika
    case 'tel':
      return !!n.telefon
    case 'bezag':
      return n.prodavac !== 'agencija' && !n.agencija
    case 'dra':
      return n.nacin !== 'oglas'
    case 'bezudjela':
      return !jeUdio(n)
  }
  return true
}

export const SKUPINE = [
  'vrste',
  'opcine',
  'mjesta',
  'cijena',
  'povrsina',
  'sobe',
  'kat',
  'zn',
  'brzo',
  'trazi',
] as const
export type Skupina = (typeof SKUPINE)[number]

export type Kontekst = {
  stanje: Stanje
  /** id -> relevance while searching, else null */
  rezultat: Map<string, number> | null
  now: number
}

export function prolaziSkupinu(n: N, s: Skupina, { stanje: st, rezultat, now }: Kontekst): boolean {
  switch (s) {
    case 'vrste':
      return !st.vrste.length || st.vrste.includes(n.vrsta)
    case 'opcine':
      return !st.opcine.length || st.opcine.includes(n.opcina)
    case 'mjesta':
      return !st.mjesta.length || st.mjesta.includes(mjesto(n))
    case 'cijena': {
      const c = n.cijena
      return !(st.cmin && c != null && c < +st.cmin) && !(st.cmax && c != null && c > +st.cmax)
    }
    case 'povrsina':
      if (n.vrsta !== 'zemljiste') {
        if (st.pmin && (n.povrsina == null || n.povrsina < +st.pmin)) return false
        if (st.pmax && (n.povrsina == null || n.povrsina > +st.pmax)) return false
      }
      if (st.zmin && (n.zemljiste == null || n.zemljiste < +st.zmin)) return false
      return !(st.m2max && (n.eur_m2 == null || n.eur_m2 > +st.m2max))
    case 'sobe':
      return !st.sobe.length || st.sobe.includes(sobeKos(n.sobe) as string)
    case 'kat': {
      if (!st.kat.length) return true
      if (n.vrsta !== 'stan') return false
      if (st.kat.includes('nezadnji') && n.zadnji_kat) return false
      const raspon = st.kat.filter((k) => k !== 'nezadnji')
      return !raspon.length || raspon.some((k) => katOk(n, k))
    }
    case 'zn':
      return st.zn.every((z) => n.znacajke.includes(z))
    case 'brzo':
      return st.brzo.every((k) => brzoOk(n, k, now))
    case 'trazi':
      return !rezultat || rezultat.has(n.id)
  }
}

/** Passes every filter group, optionally ignoring one (for chip counts). */
export function prolazi(n: N, ctx: Kontekst, osim?: Skupina): boolean {
  for (const s of SKUPINE) if (s !== osim && !prolaziSkupinu(n, s, ctx)) return false
  return true
}

export type Moje = { oznake: Record<string, Oznaka>; vidjeno: Record<string, number> }

export function uPogledu(n: N, pogled: Pogled, { oznake, vidjeno }: Moje, now: number): boolean {
  const o = oznake[n.id]
  switch (pogled) {
    case 'novo':
      return n.aktivan && !vidjeno[n.id] && o !== 'odbaceno'
    case 'favoriti':
      return o === 'favorit' || o === 'za_obilazak' || o === 'kontaktirano'
    case 'odbaceno':
      return o === 'odbaceno'
    case 'nestali':
      return !n.aktivan
    case 'rokovi': {
      const d = danaDoRoka(n, now)
      return n.aktivan && d != null && d >= 0 && o !== 'odbaceno'
    }
    default:
      return n.aktivan && o !== 'odbaceno'
  }
}

export type BrojeviCipova = {
  vrste: Map<string, number>
  opcine: Map<string, number>
  mjesta: Map<string, number>
  /** one count per CIJENE_BRZO range */
  cijene: number[]
  sobe: Map<string, number>
  kat: Map<string, number>
  zn: Map<string, number>
  brzo: Map<string, number>
}

/**
 * The number each chip would show: listings in the current view that pass every filter except
 * that chip's own group (so the count is what you would get after toggling it).
 */
export function brojeviCipova(lista: readonly N[], ctx: Kontekst, moje: Moje): BrojeviCipova {
  const uPog = lista.filter((n) => uPogledu(n, ctx.stanje.pogled, moje, ctx.now))
  const bez = (s: Skupina) => uPog.filter((n) => prolazi(n, ctx, s))
  const bc = bez('cijena')
  const bk = bez('kat').filter((n) => n.vrsta === 'stan')
  const bb = bez('brzo')
  return {
    vrste: brojac(bez('vrste'), (n) => n.vrsta),
    opcine: brojac(bez('opcine'), (n) => n.opcina),
    mjesta: brojac(bez('mjesta'), mjesto),
    cijene: CIJENE_BRZO.map(
      ([, od, do_]) =>
        bc.filter((n) => n.cijena != null && (!od || n.cijena >= +od) && (!do_ || n.cijena <= +do_))
          .length,
    ),
    sobe: brojac(bez('sobe'), (n) => sobeKos(n.sobe)),
    kat: new Map(
      KAT.map(([k]) => [
        k,
        bk.filter((n) => (k === 'nezadnji' ? !n.zadnji_kat : katOk(n, k))).length,
      ]),
    ),
    zn: brojac(bez('zn'), (n) => n.znacajke),
    brzo: new Map(BRZO.map(([k]) => [k, bb.filter((n) => brzoOk(n, k, ctx.now)).length])),
  }
}

/** Places for the kvart/naselje chips: by count, then name; chosen ones stay even at 0. */
export function mjestaZaCipove(broj: Map<string, number>, odabrana: readonly string[]): string[] {
  return [...broj.keys(), ...odabrana.filter((m) => !broj.get(m))].sort(
    (a, b) => (broj.get(b) || 0) - (broj.get(a) || 0) || a.localeCompare(b, 'hr'),
  )
}

export function prebaci(lista: readonly string[], v: string): string[] {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]
}

export type AktivanFilter = {
  kljuc: string
  tekst: string
  /** the state with this filter removed */
  makni: (s: Stanje) => Stanje
  /** the search text is shown as a chip but not counted on the "Filteri (n)" button */
  pretraga?: boolean
}

/** Active filters as removable chips above the list. */
export function aktivniFilteri(st: Stanje, znacajke: Record<string, string>): AktivanFilter[] {
  const a: AktivanFilter[] = []
  if (st.trazi) {
    a.push({
      kljuc: 'trazi',
      tekst: `„${st.trazi}”`,
      makni: (s) => ({ ...s, trazi: '' }),
      pretraga: true,
    })
  }
  if (!jeZadaneVrste(st.vrste)) {
    a.push({
      kljuc: 'vrste',
      tekst: st.vrste.length ? st.vrste.map((v) => VRSTE[v as Vrsta] || v).join(', ') : 'Sve vrste',
      makni: (s) => ({ ...s, vrste: [...VRSTE_ZADANO] }),
    })
  }
  const izListe = (polje: Lista, tekst: (v: string) => string) => {
    for (const v of st[polje]) {
      a.push({
        kljuc: `${polje}:${v}`,
        tekst: tekst(v),
        makni: (s) => ({ ...s, [polje]: s[polje].filter((x) => x !== v) }),
      })
    }
  }
  izListe('opcine', (v) => v)
  izListe('mjesta', (v) => v)
  if (st.cmin || st.cmax) {
    a.push({
      kljuc: 'cijena',
      tekst:
        st.cmin && st.cmax
          ? `${tis(st.cmin)}–${tis(st.cmax)} €`
          : st.cmin
            ? `od ${tis(st.cmin)} €`
            : `do ${tis(st.cmax)} €`,
      makni: (s) => ({ ...s, cmin: '', cmax: '' }),
    })
  }
  izListe('sobe', (v) => (v === '4' ? '4+' : v) + (v === '1' ? ' soba' : ' sobe'))
  izListe('kat', (v) => KAT.find((x) => x[0] === v)?.[1] ?? v)
  izListe('zn', (v) => znacajke[v] || v)
  izListe('brzo', (v) => BRZO.find((x) => x[0] === v)?.[1] ?? v)
  const brojevi: [Broj, string, string][] = [
    ['pmin', 'površina od ', ' m²'],
    ['pmax', 'površina do ', ' m²'],
    ['zmin', 'zemljište od ', ' m²'],
    ['m2max', 'do ', ' €/m²'],
  ]
  for (const [k, pre, post] of brojevi) {
    if (st[k])
      a.push({ kljuc: k, tekst: pre + tis(st[k]) + post, makni: (s) => ({ ...s, [k]: '' }) })
  }
  return a
}
