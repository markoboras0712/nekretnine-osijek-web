/** Purchase cost and mortgage calculator (Croatian rules as of 2026). */

import type { Nekretnina } from '@/types/podaci'

export type Kalk = {
  /** down payment, % of price */
  ucesce: number
  /** yearly interest, % */
  kamata: number
  /** loan term, years */
  godina: number
  /** agency commission, % before 25 % VAT */
  provizija: number
  /** notary, lawyer and land registry, € */
  biljeznik: number
  /** first home and under 45: possible tax refund */
  prva: boolean
}

export const KALK_ZADANO: Kalk = {
  ucesce: 20,
  kamata: 3.2,
  godina: 30,
  provizija: 3,
  biljeznik: 500,
  prva: false,
}

/** Stored settings over the defaults; unknown or malformed fields are ignored. */
export function kalkPostavke(spremljeno: unknown): Kalk {
  const k = { ...KALK_ZADANO }
  if (spremljeno && typeof spremljeno === 'object') {
    const s = spremljeno as Record<string, unknown>
    for (const kljuc of ['ucesce', 'kamata', 'godina', 'provizija', 'biljeznik'] as const) {
      const v = s[kljuc]
      if (typeof v === 'number' && Number.isFinite(v)) k[kljuc] = v
    }
    if (typeof s.prva === 'boolean') k.prva = s.prva
  }
  return k
}

/** Commission applies only to agency listings (not auctions or tenders). */
export function jeAgencija(n: Pick<Nekretnina, 'nacin' | 'prodavac' | 'agencija'>): boolean {
  return n.nacin === 'oglas' && (n.prodavac === 'agencija' || !!n.agencija)
}

/** New build from the developer: VAT is in the price, no property transfer tax. */
export function jeNovogradnja(n: Pick<Nekretnina, 'znacajke'>): boolean {
  return n.znacajke.includes('novogradnja')
}

export type Izracun = {
  c: number
  porez: number
  provizija: number
  troskovi: number
  ucesce: number
  kredit: number
  rata: number
  kamate: number
  gotovina: number
}

export function izracun(
  n: Pick<Nekretnina, 'cijena' | 'nacin' | 'prodavac' | 'agencija'>,
  k: Kalk,
  novogradnja: boolean,
): Izracun | null {
  const c = n.cijena
  if (!c) return null
  const porez = novogradnja ? 0 : 0.03 * c
  const provizija = jeAgencija(n) ? ((c * k.provizija) / 100) * 1.25 : 0
  const troskovi = porez + provizija + k.biljeznik
  const ucesce = (c * k.ucesce) / 100
  const kredit = Math.max(0, c - ucesce)
  const r = k.kamata / 1200
  const mj = Math.max(1, Math.round(k.godina * 12))
  const rata = kredit ? (r ? (kredit * r) / (1 - Math.pow(1 + r, -mj)) : kredit / mj) : 0
  return {
    c,
    porez,
    provizija,
    troskovi,
    ucesce,
    kredit,
    rata,
    kamate: rata * mj - kredit,
    gotovina: ucesce + troskovi,
  }
}

/** First-home refund: 50 % of the transfer tax, or for a new build 50 % of the VAT in the price. */
export function povrat(x: Izracun, novogradnja: boolean): number {
  return novogradnja ? (0.5 * x.c * 0.25) / 1.25 : 0.5 * x.porez
}
