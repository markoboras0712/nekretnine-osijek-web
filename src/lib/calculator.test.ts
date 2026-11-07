import { describe, expect, it } from 'vitest'
import { nek } from '@/lib/__fixtures__/nekretnina'
import { izracun, kalkPostavke, KALK_ZADANO, povrat } from '@/lib/calculator'

describe('calculator', () => {
  it('adds tax, agency commission with VAT and notary', () => {
    const x = izracun(nek({ cijena: 100000, agencija: 'X' }), KALK_ZADANO, false)!
    expect(x.porez).toBe(3000)
    expect(x.provizija).toBe(3750)
    expect(x.troskovi).toBe(7250)
    expect(x.ucesce).toBe(20000)
    expect(x.gotovina).toBe(27250)
    expect(x.kredit).toBe(80000)
    expect(Math.round(x.rata)).toBe(346)
  })

  it('has no tax for new builds and no commission at auctions', () => {
    const x = izracun(nek({ cijena: 100000, nacin: 'drazba', agencija: 'X' }), KALK_ZADANO, true)!
    expect(x.porez).toBe(0)
    expect(x.provizija).toBe(0)
  })

  it('returns null without a price', () => {
    expect(izracun(nek({ cijena: null }), KALK_ZADANO, false)).toBeNull()
  })

  it('refunds half the tax, or half the VAT for new builds', () => {
    const x = izracun(nek({ cijena: 125000 }), KALK_ZADANO, false)!
    expect(povrat(x, false)).toBe(1875)
    expect(povrat(x, true)).toBe(12500)
  })

  it('reads stored settings over the defaults', () => {
    expect(kalkPostavke({ kamata: 4, prva: true, godina: 'x' })).toEqual({
      ...KALK_ZADANO,
      kamata: 4,
      prva: true,
    })
    expect(kalkPostavke(null)).toEqual(KALK_ZADANO)
  })
})
