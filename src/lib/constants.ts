import type { Vrsta } from '@/types/podaci'

export const VRSTE: Record<Vrsta, string> = {
  stan: 'Stan',
  kuca: 'Kuća',
  zemljiste: 'Zemljište',
  poslovni: 'Poslovni prostor',
  ostalo: 'Ostalo',
}

export type Oznaka = 'favorit' | 'za_obilazak' | 'kontaktirano' | 'odbaceno'

export const OZNAKE: Record<Oznaka, string> = {
  favorit: 'Favorit',
  za_obilazak: 'Za obilazak',
  kontaktirano: 'Kontaktirano',
  odbaceno: 'Odbačeno',
}

export type Pogled = 'novo' | 'sve' | 'favoriti' | 'rokovi' | 'odbaceno' | 'nestali'

export const POGLEDI: [Pogled, string][] = [
  ['novo', 'Novo za mene'],
  ['sve', 'Sve'],
  ['favoriti', 'Favoriti'],
  ['rokovi', 'Rokovi'],
  ['odbaceno', 'Odbačeno'],
  ['nestali', 'Nestali'],
]

export const PO_STRANICI = 40
export const VRSTE_ZADANO: Vrsta[] = ['stan', 'kuca', 'zemljiste']

/** [label, od, do] in € ('' = open). */
export const CIJENE_BRZO: [string, string, string][] = [
  ['do 80k', '', '80000'],
  ['80–120k', '80000', '120000'],
  ['120–180k', '120000', '180000'],
  ['180–250k', '180000', '250000'],
  ['250k+', '250000', ''],
]

export const SOBE: [string, string][] = [
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4+'],
]

export const KAT: [string, string][] = [
  ['pr', 'Prizemlje'],
  ['nisko', '1.–2. kat'],
  ['visoko', '3. kat i više'],
  ['nezadnji', 'Nije zadnji kat'],
]

export const BRZO: [string, string][] = [
  ['tjedan', 'Novo u zadnjih 7 dana'],
  ['pad', 'Pala cijena'],
  ['ispod', '10 %+ ispod prosjeka'],
  ['foto', 'S fotografijom'],
  ['tel', 'S brojem telefona'],
  ['bezag', 'Bez agencija'],
  ['bezudjela', 'Bez suvlasničkih udjela'],
  ['dra', 'Samo natječaji i dražbe'],
]

/** "Po mojim željama": what matters to me (stored per browser). */
export const ZELJE: [string, string][] = [
  ['prosjek', 'Cijena ispod prosjeka'],
  ['cijena', 'Niža cijena'],
  ['povrsina', 'Veća površina'],
  ['zemljiste', 'Veća okućnica'],
  ['sobe', 'Više soba'],
  ['novo', 'Tek objavljeno'],
  ['pad', 'Pala cijena'],
]

export const IZBJEGAVAM: [string, string][] = [
  ['adaptacija', 'Za adaptaciju'],
  ['prizemlje', 'Prizemlje'],
  ['zadnji', 'Zadnji kat'],
  ['agencija', 'Preko agencije'],
  ['udio', 'Suvlasnički udio'],
]

export const MAX_USPOREDBA = 4

/** localStorage keys; kept from the old site so existing users keep their data. */
export const KLJUC = {
  oznake: 'nek_oznake',
  vidjeno: 'nek_vidjeno',
  vidjenoInit: 'nek_vidjeno_init',
  sort: 'nek_sort',
  pretrage: 'nek_pretrage',
  zelje: 'nek_zelje',
  kalk: 'nek_kalk',
  usporedba: 'nek_usporedba',
} as const
