import { describe, expect, it } from 'vitest'
import { dekodOznaka, kodOznaka, planUvoza, postaviOznaku, sazetakUvoza, uvezi } from '@/lib/marks'

describe('marks', () => {
  it('toggles a mark', () => {
    expect(postaviOznaku({}, '1', 'favorit')).toEqual({ 1: 'favorit' })
    expect(postaviOznaku({ 1: 'favorit' }, '1', 'favorit')).toEqual({})
    expect(postaviOznaku({ 1: 'favorit' }, '1', 'odbaceno')).toEqual({ 1: 'odbaceno' })
  })

  it('round-trips the share code', () => {
    const o = { 12: 'favorit', 34: 'favorit', 56: 'odbaceno' } as const
    expect(kodOznaka(o)).toBe('f.12.34~x.56')
    expect(dekodOznaka('f.12.34~x.56')).toEqual(o)
    expect(dekodOznaka('f.<script>~q.1')).toEqual({})
    expect(dekodOznaka('constructor.12~__proto__.13~toString.14')).toEqual({})
  })

  it('never overwrites my marks on import', () => {
    const tude = dekodOznaka('f.1.2~x.3.99')
    const moje = { 2: 'kontaktirano' as const }
    const plan = planUvoza(tude, moje, (id) => id !== '99')
    expect(plan).toEqual({ poznate: ['1', '2', '3'], nove: ['1', '3'], razlicite: ['2'] })
    expect(sazetakUvoza(tude, plan.nove)).toBe('favorit 1, odbačeno 1')
    expect(uvezi(moje, tude, plan.nove)).toEqual({ 1: 'favorit', 2: 'kontaktirano', 3: 'odbaceno' })
  })
})
