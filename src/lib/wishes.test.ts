import { describe, expect, it } from 'vitest'
import { SADA, nek } from '@/lib/__fixtures__/nekretnina'
import { mojaOcjena, rangiraj, sljedecaTezina } from '@/lib/wishes'

describe('wishes', () => {
  it('ranks within the same vrsta', () => {
    const r = rangiraj([
      nek({ id: 'a', cijena: 100 }),
      nek({ id: 'b', cijena: 300 }),
      nek({ id: 'c', cijena: 200 }),
      nek({ id: 'd', vrsta: 'kuca', cijena: 999 }),
    ])
    expect(r.get('a')?.cijena).toBe(0)
    expect(r.get('c')?.cijena).toBe(0.5)
    expect(r.get('b')?.cijena).toBe(1)
    expect(r.get('d')?.cijena).toBe(0.5)
  })

  it('cycles off -> ★ -> ★★ -> off', () => {
    expect([0, 1, 2].map(sljedecaTezina)).toEqual([1, 2, 0])
  })

  it('scores a weighted mean minus avoided traits', () => {
    const rang = { cijena: 0, povrsina: 1, zemljiste: null, sobe: null }
    const n = { ...nek({ vs_prosjek: -30, znacajke: ['lift'], kat: 0 }), rang }
    // prosjek 1 (w2), cijena 1 (w1), lift 1 (w1) => 1; prizemlje avoided => 0.75
    const m = mojaOcjena(
      n,
      { prosjek: 2, cijena: 1, lift: 1, prizemlje: -1 },
      { lift: 'Lift' },
      SADA,
    )
    expect(m.ocjena).toBe(75)
    expect(m.zasto).toEqual(['30 % ispod prosjeka', 'niža cijena', 'lift', '− prizemlje'])
  })

  it('falls back to ocjena without positive wishes', () => {
    const rang = { cijena: null, povrsina: null, zemljiste: null, sobe: null }
    expect(mojaOcjena({ ...nek({ ocjena: 80 }), rang }, {}, {}, SADA).ocjena).toBe(80)
  })
})
