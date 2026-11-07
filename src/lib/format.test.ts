import { describe, expect, it } from 'vitest'
import { SADA, nek } from '@/lib/__fixtures__/nekretnina'
import {
  brojIzvora,
  eur,
  katTekst,
  m2,
  mjesto,
  mjestoPrikaz,
  prije,
  prijeKratko,
  sobeTekst,
} from '@/lib/format'

describe('format', () => {
  it('formats euros and areas the Croatian way', () => {
    expect(eur(120000)).toBe('120.000 €')
    expect(eur(null)).toBe('')
    expect(m2(88.4)).toBe('88 m²')
    expect(m2(0)).toBe('')
    expect((1193).toLocaleString('hr-HR')).toBe('1.193')
  })

  it('describes age', () => {
    expect(prije('2026-11-07 09:00', SADA)).toBe('danas')
    expect(prije('2026-11-06 09:00', SADA)).toBe('jučer')
    expect(prije('2026-11-01 09:00', SADA)).toBe('prije 6 dana')
    expect(prije('2026-10-10 09:00', SADA)).toBe('prije 4 tj.')
    expect(prije('2026-06-01 09:00', SADA)).toBe('prije 5 mj.')
    expect(prijeKratko('2026-11-07 13:59', SADA)).toBe('upravo')
    expect(prijeKratko('2026-11-07 13:30', SADA)).toBe('prije 30 min')
    expect(prijeKratko('2026-11-07 11:00', SADA)).toBe('prije 3 h')
  })

  it('names rooms and floors', () => {
    expect(sobeTekst(1)).toBe('1 soba')
    expect(sobeTekst(3)).toBe('3 sobe')
    expect(sobeTekst(2.5)).toBe('2,5 soba')
    expect(sobeTekst(5)).toBe('5 soba')
    expect(katTekst(nek({ kat: -1 }))).toBe('suteren')
    expect(katTekst(nek({ kat: 0 }))).toBe('prizemlje')
    expect(katTekst(nek({ kat: 4, zadnji_kat: true }))).toBe('4. kat (zadnji)')
    expect(katTekst(nek({ kat: null, zadnji_kat: true }))).toBe('zadnji kat')
    expect(katTekst(nek({ vrsta: 'kuca', kat: 1 }))).toBe('')
  })

  it('uses kvart for Osijek and naselje elsewhere', () => {
    expect(mjestoPrikaz(nek({ kvart: 'Retfala' }))).toBe('Retfala')
    expect(mjestoPrikaz(nek({ kvart: '' }))).toBe('Osijek')
    expect(mjesto(nek({ kvart: '' }))).toBe('')
    expect(mjesto(nek({ opcina: 'Bilje', naselje: 'Lug', kvart: '' }))).toBe('Lug')
  })

  it('counts unique sources', () => {
    const i = { url: '', cijena: null, aktivan: true }
    expect(
      brojIzvora(
        nek({
          izvori: [
            { naziv: 'A', ...i },
            { naziv: 'A', ...i },
            { naziv: 'B', ...i },
          ],
        }),
      ),
    ).toBe(2)
  })
})
