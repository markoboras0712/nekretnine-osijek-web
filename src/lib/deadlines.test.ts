import { describe, expect, it } from 'vitest'
import { SADA, nek } from '@/lib/__fixtures__/nekretnina'
import { danaDoRoka, ics, presavij, rokTekst } from '@/lib/deadlines'

describe('deadlines', () => {
  it('counts calendar days and treats a bare date as end of day', () => {
    expect(danaDoRoka(nek({ rok: '2026-11-07' }), SADA)).toBe(0)
    expect(danaDoRoka(nek({ rok: '2026-11-07 10:00' }), SADA)).toBe(-1)
    expect(danaDoRoka(nek({ rok: '2026-11-08 09:00' }), SADA)).toBe(1)
    expect(danaDoRoka(nek({ rok: '' }), SADA)).toBeNull()
  })

  it('describes the deadline', () => {
    expect(rokTekst(nek({ rok: '2026-11-12 10:00', jamcevina: 5000 }), SADA)).toBe(
      'rok za 5 dana (12. 11. u 10:00) · jamčevina 5.000 €',
    )
    expect(rokTekst(nek({ rok: '2026-11-08 00:00' }), SADA)).toBe('rok sutra (8. 11.)')
  })

  it('folds long lines (RFC 5545)', () => {
    const r = presavij('X'.repeat(130))
    expect(r.split('\r\n').map((l) => l.length)).toEqual([60, 60, 12])
  })

  it('writes events with two alarms', () => {
    const t = ics(
      [nek({ id: '9', nacin: 'drazba', rok: '2026-11-12 10:00' })],
      (id) => `https://x/#n=${id}`,
      SADA,
    )
    expect(t).toContain('DTSTART:20261112T100000')
    expect(t).toContain('TRIGGER:-P2D')
    expect(t).toContain('TRIGGER:-PT2H')
    expect(t).toContain('SUMMARY:Dražba: Stan\\, Centar')
    expect(t.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
})
