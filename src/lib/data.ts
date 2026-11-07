import { VRSTE } from '@/lib/constants'
import { katTekst, mjesto, mjestoPrikaz, sobeTekst } from '@/lib/format'
import { norm, STALNE_FRAZE, type Indeks, type Kandidat } from '@/lib/search'
import { rangiraj, type Rang } from '@/lib/wishes'
import type { Nekretnina, Podaci } from '@/types/podaci'

/** A listing with its search index and percentile ranks, computed once after loading. */
export type Nek = Nekretnina & Indeks & { rang: Rang }

export type Pripremljeno = Omit<Podaci, 'nekretnine'> & {
  nekretnine: Nek[]
  poId: Map<string, Nek>
  /** Normalised multi-word place names, longest first: searched as phrases. */
  viseRijeci: string[]
  /** Search suggestion candidates. */
  kandidati: Kandidat[]
}

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** Fills gaps an older export might leave, and builds the search index. */
export function pripremi(d: Podaci): Pripremljeno {
  const znacajke = d.znacajke || {}
  const sirove = d.nekretnine.map((n) => ({
    ...n,
    znacajke: n.znacajke || [],
    naslov: n.naslov || '',
    opis: n.opis || '',
    izvori: n.izvori || [],
    cijene: n.cijene || [],
  }))
  const rang = rangiraj(sirove)
  const nekretnine: Nek[] = sirove.map((n) => {
    const zn = n.znacajke.map((z) => znacajke[z] || '').join(' ')
    const no = norm(n.opis)
    return {
      ...n,
      _tn: norm(
        [
          n.naslov,
          mjestoPrikaz(n),
          n.naselje,
          n.kvart,
          n.opcina,
          VRSTE[n.vrsta],
          sobeTekst(n.sobe),
        ].join(' '),
      ),
      _no: no,
      _to:
        no +
        ' ' +
        norm(
          [n.agencija, n.prodavac, zn, katTekst(n), n.izvori.map((i) => i.naziv).join(' ')].join(
            ' ',
          ),
        ),
      rang: rang.get(n.id) ?? { cijena: null, povrsina: null, zemljiste: null, sobe: null },
    }
  })
  const mj = new Set<string>()
  for (const n of nekretnine) {
    const m = norm(mjesto(n))
    if (m.indexOf(' ') > 0) mj.add(m)
  }
  const viseRijeci = [...mj, ...STALNE_FRAZE].sort((a, b) => b.length - a.length)
  return {
    ...d,
    znacajke,
    skupine_izvora: d.skupine_izvora || [],
    izvori: d.izvori || [],
    nekretnine,
    poId: new Map(nekretnine.map((n) => [n.id, n])),
    viseRijeci,
    kandidati: kandidati(nekretnine, d.podrucje, znacajke),
  }
}

const SOBE_RIJECI: [string, number][] = [
  ['garsonijera', 1],
  ['jednosoban', 1],
  ['dvosoban', 2],
  ['trosoban', 3],
  ['cetverosoban', 4],
  ['peterosoban', 4],
]

function kandidati(
  lista: readonly Nek[],
  podrucje: Record<string, string[]>,
  znacajke: Record<string, string>,
): Kandidat[] {
  const aktivne = lista.filter((n) => n.aktivan)
  const c: Omit<Kandidat, 'n'>[] = []
  for (const [m, broj] of brojac(aktivne, mjesto))
    c.push({ tip: 'mjesto', v: m, tekst: m, opis: 'kvart / naselje', broj })
  for (const o of Object.keys(podrucje)) c.push({ tip: 'opcina', v: o, tekst: o, opis: 'općina' })
  for (const [z, t] of Object.entries(znacajke)) c.push({ tip: 'zn', v: z, tekst: t, opis: 'ima' })
  for (const [v, t] of Object.entries(VRSTE)) c.push({ tip: 'vrsta', v, tekst: t, opis: 'vrsta' })
  for (const [t, s] of SOBE_RIJECI)
    c.push({ tip: 'sobe', v: String(s), tekst: t, opis: 'broj soba' })
  for (const [a, broj] of brojac(aktivne, (n) => n.agencija))
    c.push({ tip: 'tekst', v: a, tekst: a, opis: 'agencija', broj })
  return c.map((x) => ({ ...x, n: norm(x.tekst) }))
}

/** Counts of non-empty values. */
export function brojac<T>(
  lista: readonly T[],
  fn: (n: T) => string | readonly string[] | null | undefined,
): Map<string, number> {
  const c = new Map<string, number>()
  for (const n of lista) {
    const v = fn(n)
    for (const x of Array.isArray(v) ? v : [v]) {
      if (x != null && x !== '') c.set(x, (c.get(x) || 0) + 1)
    }
  }
  return c
}

export type Ucitavanje = { ok: true; podaci: Podaci } | { ok: false; greska: string }

/**
 * Fetches podaci.json. The `t` param changes every 5 minutes, so a data-only deploy shows up
 * without a hard refresh while repeat visits still hit the cache.
 */
export async function ucitajPodatke(now = Date.now()): Promise<Ucitavanje> {
  const url = `${BASE_PATH}/podaci.json?t=${Math.floor(now / 300_000)}`
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) {
      console.error('ucitajPodatke: HTTP', r.status, url)
      return { ok: false, greska: `HTTP ${r.status}` }
    }
    const podaci = (await r.json()) as Podaci
    if (!Array.isArray(podaci?.nekretnine)) {
      console.error('ucitajPodatke: unexpected shape', url)
      return { ok: false, greska: 'neispravan format' }
    }
    return { ok: true, podaci }
  } catch (e) {
    console.error('ucitajPodatke: failed', url, e)
    return { ok: false, greska: 'mreža nije dostupna' }
  }
}
