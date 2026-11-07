/**
 * The contract of podaci.json, written by the backend (nekretnine/objava.py:izvoz()).
 * Do not rename fields here without changing the backend.
 */

export type Vrsta = 'stan' | 'kuca' | 'zemljiste' | 'poslovni' | 'ostalo'
export type Nacin = 'oglas' | 'drazba' | 'natjecaj'

export type Izvor = { naziv: string; radi: boolean; zadnji_uspjeh: string | null }

export type SkupinaIzvora = {
  naziv: string
  kako: string
  svakih_min: number | null
  izvori: Izvor[]
}

export type IzvorOglasa = { naziv: string; url: string; cijena: number | null; aktivan: boolean }

export type Nekretnina = {
  /** Stable id, used in marks, links and WhatsApp messages. */
  id: string
  vrsta: Vrsta
  opcina: string
  naselje: string
  /** Osijek neighbourhood, '' if unknown or not Osijek. */
  kvart: string
  sobe: number | null
  /** -1 suteren, 0 prizemlje. */
  kat: number | null
  zadnji_kat: boolean
  /** Keys of Podaci.znacajke, extracted from the ad text. */
  znacajke: string[]
  cijena: number | null
  povrsina: number | null
  zemljiste: number | null
  eur_m2: number | null
  /** % vs the place average, negative = cheaper. */
  vs_prosjek: number | null
  ocjena: number
  prolazi: boolean
  razlozi: string
  naslov: string
  opis: string
  telefon: string
  slika: string
  url: string
  izvori: IzvorOglasa[]
  /** First seen / published, "YYYY-MM-DD HH:MM" local time. */
  od: string
  nacin: Nacin
  /** Deadline "YYYY-MM-DD HH:MM" or ''. */
  rok: string
  jamcevina: number | null
  prodavac: string
  agencija: string
  zemljiste_vrsta: string
  /** 'udio' | 'udio?' = co-ownership share. */
  predmet: string
  aktivan: boolean
  /** Price history, last 8: [date, price]. */
  cijene: [string, number][]
  /** Biggest drop in the last 30 days. */
  pad: { eur: number; posto: number; datum: string } | null
}

export type Podaci = {
  /** "2026-11-07 13:56:20", local time (Europe/Zagreb). */
  generirano: string
  naslov: string
  /** općina -> naselja */
  podrucje: Record<string, string[]>
  /** "mjesto|vrsta" -> [median €/m², count]; fall back to "općina|vrsta". */
  prosjeci: Record<string, [number, number]>
  /** feature key -> Croatian label */
  znacajke: Record<string, string>
  izvori: Izvor[]
  skupine_izvora: SkupinaIzvora[]
  nekretnine: Nekretnina[]
}
