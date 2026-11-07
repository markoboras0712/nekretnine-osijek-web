import { describe, expect, it } from 'vitest'
import { SADA, nek } from '@/lib/__fixtures__/nekretnina'
import {
  aktivniFilteri,
  brojeviCipova,
  prazno,
  prolazi,
  sobeKos,
  uPogledu,
  type Kontekst,
  type Stanje,
} from '@/lib/filters'

const ctx = (o: Partial<Stanje> = {}, rezultat: Map<string, number> | null = null): Kontekst => ({
  stanje: { ...prazno(), ...o },
  rezultat,
  now: SADA,
})
const moje = { oznake: {}, vidjeno: {} }

describe('filters', () => {
  it('defaults to flats, houses and land', () => {
    expect(prolazi(nek({ vrsta: 'stan' }), ctx())).toBe(true)
    expect(prolazi(nek({ vrsta: 'poslovni' }), ctx())).toBe(false)
    expect(prolazi(nek({ vrsta: 'poslovni' }), ctx({ vrste: [] }))).toBe(true)
  })

  it('filters by place key (kvart in Osijek)', () => {
    expect(prolazi(nek({ kvart: 'Retfala' }), ctx({ mjesta: ['Retfala'] }))).toBe(true)
    expect(prolazi(nek({ kvart: 'Centar' }), ctx({ mjesta: ['Retfala'] }))).toBe(false)
  })

  it('keeps listings without a price in price filters', () => {
    expect(prolazi(nek({ cijena: 200000 }), ctx({ cmax: '150000' }))).toBe(false)
    expect(prolazi(nek({ cijena: null }), ctx({ cmax: '150000' }))).toBe(true)
  })

  it('needs a known area for area filters, except land for floor area', () => {
    expect(prolazi(nek({ povrsina: null }), ctx({ pmin: '40' }))).toBe(false)
    expect(prolazi(nek({ vrsta: 'zemljiste', povrsina: null }), ctx({ pmin: '40' }))).toBe(true)
  })

  it('buckets rooms', () => {
    expect([1, 1.5, 2, 2.5, 3, 4, 6].map(sobeKos)).toEqual(['1', '1', '2', '2', '3', '4', '4'])
  })

  it('filters floors for flats only', () => {
    expect(prolazi(nek({ kat: 0 }), ctx({ kat: ['pr'] }))).toBe(true)
    expect(prolazi(nek({ vrsta: 'kuca', kat: 0 }), ctx({ kat: ['pr'] }))).toBe(false)
    expect(prolazi(nek({ kat: 5, zadnji_kat: true }), ctx({ kat: ['visoko', 'nezadnji'] }))).toBe(
      false,
    )
  })

  it('requires every chosen feature', () => {
    expect(prolazi(nek({ znacajke: ['lift', 'garaza'] }), ctx({ zn: ['lift', 'garaza'] }))).toBe(
      true,
    )
    expect(prolazi(nek({ znacajke: ['lift'] }), ctx({ zn: ['lift', 'garaza'] }))).toBe(false)
  })

  it('applies quick toggles', () => {
    expect(prolazi(nek({ agencija: 'X' }), ctx({ brzo: ['bezag'] }))).toBe(false)
    expect(prolazi(nek({ prodavac: 'agencija' }), ctx({ brzo: ['bezag'] }))).toBe(false)
    expect(prolazi(nek({ predmet: 'udio?' }), ctx({ brzo: ['bezudjela'] }))).toBe(false)
    expect(prolazi(nek({ od: '2026-11-05 10:00' }), ctx({ brzo: ['tjedan'] }))).toBe(true)
    expect(prolazi(nek({ od: '2026-10-05 10:00' }), ctx({ brzo: ['tjedan'] }))).toBe(false)
    expect(prolazi(nek({ vs_prosjek: -10 }), ctx({ brzo: ['ispod'] }))).toBe(true)
  })

  it('applies the search result', () => {
    expect(prolazi(nek({ id: '1' }), ctx({}, new Map([['2', 1]])))).toBe(false)
  })
})

describe('views', () => {
  it('splits by marks and activity', () => {
    const n = nek({ id: '7' })
    expect(uPogledu(n, 'novo', moje, SADA)).toBe(true)
    expect(uPogledu(n, 'novo', { oznake: {}, vidjeno: { 7: 1 } }, SADA)).toBe(false)
    expect(uPogledu(n, 'sve', { oznake: { 7: 'odbaceno' }, vidjeno: {} }, SADA)).toBe(false)
    expect(uPogledu(n, 'favoriti', { oznake: { 7: 'za_obilazak' }, vidjeno: {} }, SADA)).toBe(true)
    expect(uPogledu(nek({ aktivan: false }), 'nestali', moje, SADA)).toBe(true)
    expect(uPogledu(nek({ rok: '2026-11-10 10:00' }), 'rokovi', moje, SADA)).toBe(true)
    expect(uPogledu(nek({ rok: '2026-11-01 10:00' }), 'rokovi', moje, SADA)).toBe(false)
  })
})

describe('chip counts', () => {
  it('counts what a toggle would give, ignoring its own group', () => {
    const lista = [
      nek({ id: '1', vrsta: 'stan' }),
      nek({ id: '2', vrsta: 'kuca' }),
      nek({ id: '3', vrsta: 'kuca', cijena: 300000 }),
    ]
    const b = brojeviCipova(lista, ctx({ vrste: ['stan'], cmax: '200000' }), moje)
    expect(b.vrste.get('kuca')).toBe(1)
    expect(b.vrste.get('stan')).toBe(1)
    // cijene ignore the price filter but keep vrste = stan
    expect(b.cijene).toEqual([0, 1, 0, 0, 0])
  })
})

describe('active filters', () => {
  it('lists removable chips', () => {
    const st = { ...prazno(), trazi: 'lift', mjesta: ['Retfala'], cmin: '80000', sobe: ['4'] }
    const a = aktivniFilteri(st, {})
    expect(a.map((x) => x.tekst)).toEqual(['„lift”', 'Retfala', 'od 80.000 €', '4+ sobe'])
    expect(a[1]!.makni(st).mjesta).toEqual([])
  })
})
