import { describe, expect, it } from 'vitest'
import { SADA, nek } from '@/lib/__fixtures__/nekretnina'
import { istaknuto, obrniSmjer, tekstSmjera, usporedba, type SortKontekst } from '@/lib/sort'

const ctx: SortKontekst = { rezultat: null, moja: () => ({ ocjena: 0, zasto: [] }), now: SADA }

describe('sort', () => {
  it('sorts by price ascending by default with nulls last', () => {
    const l = [
      nek({ id: 'a', cijena: 200 }),
      nek({ id: 'b', cijena: null }),
      nek({ id: 'c', cijena: 100 }),
    ]
    expect(l.sort(usporedba('cijena', 0, ctx)).map((n) => n.id)).toEqual(['c', 'a', 'b'])
    expect(l.sort(usporedba('cijena', -1, ctx)).map((n) => n.id)).toEqual(['a', 'c', 'b'])
  })

  it('breaks ties by ocjena, then newer', () => {
    const l = [
      nek({ id: 'a', ocjena: 50, od: '2026-11-01 10:00' }),
      nek({ id: 'b', ocjena: 70 }),
      nek({ id: 'c', ocjena: 50, od: '2026-11-05 10:00' }),
    ]
    expect(l.sort(usporedba('cijena', 0, ctx)).map((n) => n.id)).toEqual(['b', 'c', 'a'])
  })

  it('toggles direction and stores the default as 0', () => {
    expect(obrniSmjer('cijena', 0)).toBe(-1)
    expect(obrniSmjer('cijena', -1)).toBe(0)
    expect(tekstSmjera('cijena', 0)).toBe('najjeftinije prvo')
    expect(tekstSmjera('relevantno', 0)).toBeNull()
  })

  it('highlights the sorted-by value', () => {
    expect(istaknuto(nek({ od: '2026-08-18 10:00' }), 'datum', 1, ctx)?.tekst).toBe(
      'na tržištu 81 dan',
    )
    expect(istaknuto(nek(), 'datum', 0, ctx)).toBeNull()
    expect(
      istaknuto(nek({ pad: { eur: 10000, posto: 11, datum: '2026-11-05 10:00' } }), 'pad', 0, ctx)
        ?.tekst,
    ).toBe('−10.000 € (−11 %) prije 2 dana')
  })
})
