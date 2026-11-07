/** Personal marks (favorit, za obilazak, ...) and sharing them as a link. */

import { OZNAKE, type Oznaka } from '@/lib/constants'

export type Oznake = Record<string, Oznaka>

export function jeOznaka(v: unknown): v is Oznaka {
  return typeof v === 'string' && v in OZNAKE
}

/** Clicking the current mark (or none) clears it; any other mark replaces it. */
export function postaviOznaku(oznake: Oznake, id: string, ozn: Oznaka | null): Oznake {
  const { [id]: staro, ...ostale } = oznake
  return !ozn || staro === ozn ? ostale : { ...ostale, [id]: ozn }
}

const KRATICE: Record<Oznaka, string> = {
  favorit: 'f',
  za_obilazak: 'o',
  kontaktirano: 'k',
  odbaceno: 'x',
}

/** {12: favorit, 34: favorit, 56: odbaceno} -> "f.12.34~x.56" */
export function kodOznaka(oznake: Oznake): string {
  const po = new Map<string, string[]>()
  for (const [id, o] of Object.entries(oznake)) {
    const k = KRATICE[o]
    if (!k) continue
    po.set(k, [...(po.get(k) ?? []), id])
  }
  return [...po].map(([k, ids]) => k + '.' + ids.join('.')).join('~')
}

/** Inverse of kodOznaka; ids that do not look like ids are dropped. */
export function dekodOznaka(kod: string): Oznake {
  const obrnuto = Object.fromEntries(Object.entries(KRATICE).map(([o, k]) => [k, o])) as Record<
    string,
    Oznaka
  >
  const van: Oznake = {}
  for (const dio of String(kod || '').split('~')) {
    const [k, ...ids] = dio.split('.')
    const o = k ? obrnuto[k] : undefined
    if (!o) continue
    for (const id of ids) if (/^[\w-]{1,20}$/.test(id)) van[id] = o
  }
  return van
}

export type PlanUvoza = {
  /** ids known in the current data */
  poznate: string[]
  /** ids where I have no mark: these get the shared one */
  nove: string[]
  /** ids where I already have a different mark: mine stays */
  razlicite: string[]
}

/** Shared marks are added only where I have none; mine are never overwritten. */
export function planUvoza(tude: Oznake, moje: Oznake, postoji: (id: string) => boolean): PlanUvoza {
  const poznate = Object.keys(tude).filter(postoji)
  return {
    poznate,
    nove: poznate.filter((id) => !moje[id]),
    razlicite: poznate.filter((id) => moje[id] && moje[id] !== tude[id]),
  }
}

/** "favorit 2, odbačeno 1" for the import banner. */
export function sazetakUvoza(tude: Oznake, nove: readonly string[]): string {
  const po = new Map<Oznaka, number>()
  for (const id of nove) {
    const o = tude[id]
    if (o) po.set(o, (po.get(o) || 0) + 1)
  }
  return [...po].map(([o, b]) => `${OZNAKE[o].toLowerCase()} ${b}`).join(', ')
}

export function uvezi(moje: Oznake, tude: Oznake, nove: readonly string[]): Oznake {
  const van = { ...moje }
  for (const id of nove) {
    const o = tude[id]
    if (o) van[id] = o
  }
  return van
}
