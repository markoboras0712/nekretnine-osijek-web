/**
 * Filter state <-> URL query, compatible with links from the old site and WhatsApp messages:
 * p, v, o, m, s, kat, zn, b, cmin, cmax, pmin, pmax, zmin, m2max, trazi, sort, smjer, prikaz;
 * legacy bezag=1, dra=1 and sorts novo|najdulje|cijena_up|cijena_down.
 */

import { POGLEDI, type Pogled } from '@/lib/constants'
import { BROJEVI, jeZadaneVrste, prazno, type Lista, type Stanje } from '@/lib/filters'
import { jeSort, type SortKey } from '@/lib/sort'

const PARAMI: [Lista, string][] = [
  ['opcine', 'o'],
  ['mjesta', 'm'],
  ['sobe', 's'],
  ['kat', 'kat'],
  ['zn', 'zn'],
  ['brzo', 'b'],
]

const STARI_SORT: Record<string, [SortKey, number]> = {
  novo: ['datum', -1],
  najdulje: ['datum', 1],
  cijena_up: ['cijena', 1],
  cijena_down: ['cijena', -1],
}

export type SortPar = [SortKey, number]

export function uQuery(st: Stanje): string {
  const p = new URLSearchParams()
  if (st.pogled !== 'sve') p.set('p', st.pogled)
  if (!jeZadaneVrste(st.vrste)) p.set('v', st.vrste.join(','))
  for (const [k, q] of PARAMI) if (st[k].length) p.set(q, st[k].join(','))
  for (const k of [...BROJEVI, 'trazi'] as const) if (st[k]) p.set(k, st[k])
  if (st.sort !== 'ocjena' && st.sort !== 'relevantno') p.set('sort', st.sort)
  if (st.smjer && st.sort !== 'relevantno') p.set('smjer', st.smjer > 0 ? 'gore' : 'dolje')
  if (st.prikaz === 'karta') p.set('prikaz', 'karta')
  return p.toString()
}

/** The stored nek_sort value: [sort, smjer], or a legacy plain string. */
export function citajSpremljenSort(v: unknown): SortPar | null {
  if (typeof v === 'string') {
    if (Object.hasOwn(STARI_SORT, v)) return STARI_SORT[v] as SortPar
    return [jeSort(v) ? v : 'ocjena', 0]
  }
  if (Array.isArray(v) && jeSort(v[0])) return [v[0], typeof v[1] === 'number' ? v[1] : 0]
  return null
}

function jePogled(v: string | null): v is Pogled {
  return POGLEDI.some(([k]) => k === v)
}

export type IzUrla = {
  stanje: Stanje
  /** sort to restore when the search is cleared */
  sortPrijeTrazenja: SortPar | null
}

/**
 * Parses a query. `pogled` keeps the current view when applying a saved search (whose query
 * has no p); `spremljen` is the visitor's stored sort, used when the URL has none.
 */
export function izQuery(
  query: string,
  { pogled, spremljen }: { pogled?: Pogled; spremljen?: SortPar | null } = {},
): IzUrla {
  const p = new URLSearchParams(query)
  const st = prazno()
  const pp = p.get('p')
  st.pogled = jePogled(pp) ? pp : (pogled ?? 'sve')
  const v = p.get('v')
  if (v != null) st.vrste = v ? v.split(',') : []
  for (const [k, q] of PARAMI) {
    const x = p.get(q)
    if (x) st[k] = x.split(',')
  }
  if (p.get('bezag') === '1' && !st.brzo.includes('bezag')) st.brzo.push('bezag')
  if (p.get('dra') === '1' && !st.brzo.includes('dra')) st.brzo.push('dra')
  for (const k of [...BROJEVI, 'trazi'] as const) {
    const x = p.get(k)
    if (x) st[k] = x
  }
  const urlSort = p.get('sort')
  let sort: string = urlSort || spremljen?.[0] || 'ocjena'
  const sm = p.get('smjer')
  let smjer = sm === 'gore' ? 1 : sm === 'dolje' ? -1 : !urlSort && spremljen ? spremljen[1] : 0
  if (Object.hasOwn(STARI_SORT, sort)) [sort, smjer] = STARI_SORT[sort] as SortPar
  st.sort = jeSort(sort) && sort !== 'relevantno' ? sort : 'ocjena'
  st.smjer = smjer
  st.prikaz = p.get('prikaz') === 'karta' ? 'karta' : 'popis'
  let sortPrijeTrazenja: SortPar | null = null
  if (st.trazi) {
    sortPrijeTrazenja = [st.sort, st.smjer]
    if (!urlSort) {
      st.sort = 'relevantno'
      st.smjer = 0
    }
  }
  return { stanje: st, sortPrijeTrazenja }
}

/** A query without the view (saved searches apply to whichever view is open). */
export function bezPogleda(q: string): string {
  const p = new URLSearchParams(q)
  p.delete('p')
  return p.toString()
}

// ---------- the search text and the "Najrelevantnije" sort ----------

/**
 * Sets the search text. Starting a search switches to "Najrelevantnije" and remembers the
 * previous sort; clearing it restores that sort.
 */
export function postaviTrazi(
  st: Stanje,
  prije: SortPar | null,
  trazi: string,
): { stanje: Stanje; sortPrijeTrazenja: SortPar | null } {
  const t = trazi.trim()
  // Only the first keystroke switches the sort, so a sort picked while searching sticks.
  if (t && !st.trazi && st.sort !== 'relevantno') {
    return {
      stanje: { ...st, trazi: t, sort: 'relevantno', smjer: 0 },
      sortPrijeTrazenja: [st.sort, st.smjer],
    }
  }
  if (!t) return vratiSort({ ...st, trazi: '' }, prije)
  return { stanje: { ...st, trazi: t }, sortPrijeTrazenja: prije }
}

/** Leaves "Najrelevantnije" for the sort used before searching. */
export function vratiSort(
  st: Stanje,
  prije: SortPar | null,
): { stanje: Stanje; sortPrijeTrazenja: null } {
  if (st.sort !== 'relevantno') return { stanje: st, sortPrijeTrazenja: null }
  const [sort, smjer] = prije ?? ['ocjena', 0]
  return { stanje: { ...st, sort, smjer }, sortPrijeTrazenja: null }
}

/** "Očisti sve": back to defaults, keeping the view and the (non-search) sort. */
export function ocistiSve(st: Stanje, prije: SortPar | null): Stanje {
  const [sort, smjer]: SortPar =
    st.sort === 'relevantno' ? (prije ?? ['ocjena', 0]) : [st.sort, st.smjer]
  return { ...prazno(), pogled: st.pogled, sort, smjer }
}
