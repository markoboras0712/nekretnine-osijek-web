/** Map data: one circle per neighbourhood / village. Ads rarely give an address, so a circle
 * sits at the centre of the place, not at the property. */

import { eur, mjesto, tis } from '@/lib/format'
import type { Nekretnina } from '@/types/podaci'

/** Centres from OpenStreetMap (Nominatim), November 2026. Osijek = Trg Ante Starčevića. */
export const KOORD: Record<string, [number, number]> = {
  Osijek: [45.55488, 18.69537],
  Centar: [45.56154, 18.67682],
  Tvrđa: [45.5605, 18.69578],
  Tvrđavica: [45.57327, 18.68011],
  'Gornji grad': [45.5578, 18.6712],
  'Donji grad': [45.55568, 18.71956],
  'Novi grad': [45.54961, 18.70004],
  'Industrijska četvrt': [45.54666, 18.67917],
  'Jug 2': [45.5459, 18.71722],
  'Jug 1': [45.54773, 18.70852],
  Sjenjak: [45.55172, 18.69838],
  Retfala: [45.56192, 18.64772],
  'Cvjetno naselje': [45.53407, 18.63096],
  'Vatrogasno naselje': [45.54627, 18.7012],
  'Bosutsko naselje': [45.54646, 18.67514],
  'Zeleno polje': [45.55242, 18.73057],
  'Uske njive': [45.54241, 18.70153],
  Bikara: [45.54655, 18.7292],
  Pampas: [45.56991, 18.64879],
  Tenja: [45.50171, 18.74461],
  Josipovac: [45.57855, 18.58658],
  Višnjevac: [45.56597, 18.61983],
  Sarvaš: [45.52572, 18.83837],
  Briješće: [45.52477, 18.62716],
  Brijest: [45.52133, 18.67629],
  Podravlje: [45.56255, 18.71109],
  Klisa: [45.47535, 18.83319],
  Nemetin: [45.53979, 18.77521],
  Antunovac: [45.48304, 18.69459],
  Ivanovac: [45.48255, 18.64267],
  Bilje: [45.60398, 18.74376],
  Kopačevo: [45.6001, 18.78714],
  Lug: [45.66111, 18.77858],
  Vardarac: [45.62369, 18.77047],
  Podunavlje: [45.6304, 18.8135],
  Tikveš: [45.67154, 18.84506],
  'Zlatna Greda': [45.72128, 18.86511],
  Čepin: [45.5236, 18.57372],
  Beketinci: [45.45704, 18.48108],
  'Čepinski Martinci': [45.51355, 18.4723],
  Čokadinci: [45.50075, 18.44194],
  Livana: [45.52995, 18.61416],
  Ovčara: [45.50716, 18.56831],
  Petrijevci: [45.61417, 18.53496],
  Satnica: [45.61438, 18.48949],
  Valpovo: [45.65913, 18.41788],
  Ladimirevci: [45.62541, 18.44508],
  Harkanovci: [45.58922, 18.33453],
  Ivanovci: [45.62149, 18.38501],
  Marjančaci: [45.63283, 18.39444],
  Nard: [45.66259, 18.484],
  Šag: [45.63927, 18.46682],
  Zelčin: [45.61447, 18.36577],
}

/** City neighbourhoods: zoomed out they merge into one "Osijek" circle (they would overlap). */
export const GRAD = [
  'Osijek',
  'Centar',
  'Tvrđa',
  'Tvrđavica',
  'Gornji grad',
  'Donji grad',
  'Novi grad',
  'Industrijska četvrt',
  'Jug 2',
  'Jug 1',
  'Sjenjak',
  'Retfala',
  'Cvjetno naselje',
  'Vatrogasno naselje',
  'Bosutsko naselje',
  'Zeleno polje',
  'Uske njive',
  'Bikara',
  'Pampas',
  'Podravlje',
]

export const ZOOM_GRAD = 12.5

export type Skupina = {
  naziv: string
  /** općina, used for coordinates when the place itself is unknown */
  rezerva: string
  broj: number
  /** Osijek without a kvart: grey, no "Prikaži popis" */
  nepoznat: boolean
  redovi: string[]
  oznacen: boolean
}

export function medijan(niz: readonly number[]): number | null {
  if (!niz.length) return null
  const s = [...niz].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2
}

export function koordinate(s: Pick<Skupina, 'naziv' | 'rezerva'>): [number, number] | null {
  return KOORD[s.naziv] ?? KOORD[s.rezerva] ?? null
}

/** Groups the current list by place, with middle price, flat €/m² and the cheapest. */
export function skupine(lista: readonly Nekretnina[], odabrana: readonly string[]): Skupina[] {
  const g = new Map<string, { s: Skupina; cijene: number[]; m2: number[] }>()
  for (const n of lista) {
    const m = mjesto(n)
    const kljuc = m || (n.opcina === 'Osijek' ? 'Osijek' : n.naselje || n.opcina || '')
    if (!kljuc) continue
    let x = g.get(kljuc)
    if (!x) {
      x = {
        s: {
          naziv: kljuc,
          rezerva: n.opcina,
          broj: 0,
          nepoznat: !m && n.opcina === 'Osijek',
          redovi: [],
          oznacen: odabrana.includes(kljuc),
        },
        cijene: [],
        m2: [],
      }
      g.set(kljuc, x)
    }
    x.s.broj++
    if (n.cijena != null) x.cijene.push(n.cijena)
    if (n.vrsta === 'stan' && n.eur_m2) x.m2.push(n.eur_m2)
  }
  return [...g.values()].map(({ s, cijene, m2 }) => {
    const mc = medijan(cijene)
    const mm = medijan(m2)
    s.redovi = [
      mc != null ? 'Srednja cijena: ' + eur(mc) : '',
      mm ? `Stanovi: ${tis(Math.round(mm))} €/m² (srednje)` : '',
      cijene.length ? 'Najjeftinije: ' + eur(Math.min(...cijene)) : '',
    ].filter(Boolean)
    return s
  })
}

export type Krug = Skupina & { k: [number, number]; grad?: boolean }

/** What to draw at a zoom level: city neighbourhoods merged into "Osijek" below ZOOM_GRAD. */
export function krugovi(sk: readonly Skupina[], zoom: number): { krugovi: Krug[]; max: number } {
  const vidljive = sk.flatMap((s) => {
    const k = koordinate(s)
    return k ? [{ ...s, k }] : []
  })
  const spoji = zoom < ZOOM_GRAD
  const grad = spoji ? vidljive.filter((s) => GRAD.includes(s.naziv)) : []
  const ostale = vidljive.filter((s) => !grad.includes(s))
  const ukGrad = grad.reduce((a, s) => a + s.broj, 0)
  const max = Math.max(1, ukGrad, ...ostale.map((s) => s.broj))
  const van: Krug[] = [...ostale]
  if (ukGrad) {
    van.unshift({
      naziv: 'Osijek',
      rezerva: 'Osijek',
      broj: ukGrad,
      nepoznat: false,
      redovi: [],
      oznacen: grad.some((s) => s.oznacen),
      k: KOORD.Osijek as [number, number],
      grad: true,
    })
  }
  return { krugovi: van, max }
}

/** Circle radius in px: size ∝ √count, a bit larger when zoomed in. */
export function polumjer(broj: number, max: number, zoom: number): number {
  const f = zoom >= 14 ? 1.15 : zoom >= 13 ? 1 : 0.85
  return Math.round((12 + 20 * Math.sqrt(broj / max)) * f)
}
