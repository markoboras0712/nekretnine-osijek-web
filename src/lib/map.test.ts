import { describe, expect, it } from 'vitest'
import { nek } from '@/lib/__fixtures__/nekretnina'
import { krugovi, medijan, polumjer, skupine } from '@/lib/map'

describe('map', () => {
  const lista = [
    nek({ id: '1', kvart: 'Retfala', cijena: 100000, eur_m2: 2000 }),
    nek({ id: '2', kvart: 'Retfala', cijena: 200000, eur_m2: 2500 }),
    nek({ id: '3', kvart: 'Centar', cijena: 150000 }),
    nek({ id: '4', kvart: '' }),
    nek({ id: '5', opcina: 'Bilje', naselje: 'Lug', kvart: '', vrsta: 'kuca', cijena: 90000 }),
  ]

  it('groups by place with summary rows', () => {
    const s = skupine(lista, ['Retfala'])
    const r = s.find((x) => x.naziv === 'Retfala')!
    expect(r.broj).toBe(2)
    expect(r.oznacen).toBe(true)
    expect(r.redovi).toEqual([
      'Srednja cijena: 150.000 €',
      'Stanovi: 2.250 €/m² (srednje)',
      'Najjeftinije: 100.000 €',
    ])
    expect(s.find((x) => x.naziv === 'Osijek')?.nepoznat).toBe(true)
  })

  it('merges city neighbourhoods when zoomed out', () => {
    const s = skupine(lista, [])
    const daleko = krugovi(s, 11)
    expect(daleko.krugovi.map((k) => [k.naziv, k.broj])).toEqual([
      ['Osijek', 4],
      ['Lug', 1],
    ])
    expect(
      krugovi(s, 13)
        .krugovi.map((k) => k.naziv)
        .sort(),
    ).toEqual(['Centar', 'Lug', 'Osijek', 'Retfala'])
  })

  it('computes medians and radii', () => {
    expect(medijan([3, 1, 2])).toBe(2)
    expect(medijan([1, 2, 3, 4])).toBe(2.5)
    expect(medijan([])).toBeNull()
    expect(polumjer(4, 4, 13)).toBe(32)
    expect(polumjer(1, 4, 11)).toBe(19)
  })
})
