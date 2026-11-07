/** "Po mojim željama": a personal 0-100 score from the priorities a visitor picks. */

import { IZBJEGAVAM, ZELJE } from '@/lib/constants'
import { danaNaTrzistu, jeUdio } from '@/lib/format'
import type { Nekretnina } from '@/types/podaci'

/** Weight per wish key: 1 = ★, 2 = ★★, -1 = avoided trait. */
export type Zelje = Record<string, number>

/** Position of a value among listings of the same vrsta: 0 = smallest, 1 = largest. */
export type Rang = {
  cijena: number | null
  povrsina: number | null
  zemljiste: number | null
  sobe: number | null
}

const RANGIRANO = ['cijena', 'povrsina', 'zemljiste', 'sobe'] as const

export function rangiraj(
  lista: readonly Pick<Nekretnina, 'id' | 'vrsta' | (typeof RANGIRANO)[number]>[],
): Map<string, Rang> {
  const van = new Map<string, Rang>()
  for (const n of lista)
    van.set(n.id, { cijena: null, povrsina: null, zemljiste: null, sobe: null })
  for (const p of RANGIRANO) {
    const po = new Map<string, number[]>()
    for (const n of lista) {
      const v = n[p]
      if (v == null) continue
      const niz = po.get(n.vrsta) ?? []
      niz.push(v)
      po.set(n.vrsta, niz)
    }
    for (const niz of po.values()) niz.sort((a, b) => a - b)
    for (const n of lista) {
      const v = n[p]
      const niz = po.get(n.vrsta)
      const r = van.get(n.id) as Rang
      r[p] = v == null || !niz ? null : niz.length < 2 ? 0.5 : niz.indexOf(v) / (niz.length - 1)
    }
  }
  return van
}

type ZaZelje = Pick<
  Nekretnina,
  | 'vrsta'
  | 'vs_prosjek'
  | 'znacajke'
  | 'od'
  | 'pad'
  | 'kat'
  | 'zadnji_kat'
  | 'prodavac'
  | 'agencija'
  | 'predmet'
  | 'ocjena'
> & { rang: Rang }

export function imaZelja(z: Zelje): boolean {
  return Object.values(z).some((w) => w > 0)
}

/** off -> ★ -> ★★ -> off */
export function sljedecaTezina(w: number): number {
  return w === 0 ? 1 : w === 1 ? 2 : 0
}

export function izbjegava(n: ZaZelje, k: string): boolean {
  switch (k) {
    case 'adaptacija':
      return n.znacajke.includes('adaptacija')
    case 'prizemlje':
      return n.vrsta === 'stan' && n.kat != null && n.kat <= 0
    case 'zadnji':
      return !!n.zadnji_kat
    case 'agencija':
      return n.prodavac === 'agencija' || !!n.agencija
    case 'udio':
      return jeUdio(n)
  }
  return false
}

/** 0-1: how well a listing meets one wish. Unknown keys are features from the ad text. */
export function komponenta(n: ZaZelje, k: string, now: number): number {
  switch (k) {
    case 'prosjek':
      return n.vs_prosjek == null ? 0 : Math.max(-0.5, Math.min(1, -n.vs_prosjek / 30))
    case 'cijena':
      return n.rang.cijena == null ? 0 : 1 - n.rang.cijena
    case 'povrsina':
      return n.vrsta === 'zemljiste' ? 0 : n.rang.povrsina || 0
    case 'zemljiste':
      return n.rang.zemljiste || 0
    case 'sobe':
      return n.rang.sobe || 0
    case 'novo': {
      const d = danaNaTrzistu(n, now)
      return d == null ? 0 : Math.max(0, 1 - d / 60)
    }
    case 'pad':
      return n.pad ? Math.min(1, n.pad.posto / 10) : 0
  }
  return n.znacajke.includes(k) ? 1 : 0
}

export function nazivZelje(k: string, znacajke: Record<string, string>): string {
  const z = [...ZELJE, ...IZBJEGAVAM].find((x) => x[0] === k)
  return z ? z[1] : znacajke[k] || k
}

export type MojaOcjena = { ocjena: number; zasto: string[] }

/**
 * Weighted mean of the wished components, minus 0.25 per avoided trait, as 0-100. Without any
 * positive wish the base is the listing's own ocjena. `zasto` lists what fits (component ≥ 0.6)
 * and what is avoided.
 */
export function mojaOcjena(
  n: ZaZelje,
  zelje: Zelje,
  znacajke: Record<string, string>,
  now: number,
): MojaOcjena {
  let zbroj = 0
  let tez = 0
  const zasto: string[] = []
  for (const [k, w] of Object.entries(zelje)) {
    if (w <= 0) continue
    const c = komponenta(n, k, now)
    zbroj += w * c
    tez += w
    if (c >= 0.6) {
      zasto.push(
        k === 'prosjek'
          ? `${-(n.vs_prosjek as number)} % ispod prosjeka`
          : nazivZelje(k, znacajke).toLowerCase(),
      )
    }
  }
  let o = tez ? zbroj / tez : n.ocjena / 100
  for (const [k, w] of Object.entries(zelje)) {
    if (w < 0 && izbjegava(n, k)) {
      o -= 0.25
      zasto.push('− ' + nazivZelje(k, znacajke).toLowerCase())
    }
  }
  return { ocjena: Math.max(0, Math.round(o * 100)), zasto }
}
