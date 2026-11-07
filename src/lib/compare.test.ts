import { describe, expect, it } from 'vitest'
import { najboljiURetku } from '@/lib/compare'

describe('comparison', () => {
  it('picks the best known value', () => {
    expect(najboljiURetku([3, null, 1, 1], 'min')).toBe(1)
    expect(najboljiURetku([3, null, 1], 'max')).toBe(3)
  })

  it('highlights nothing when values are equal or only one is known', () => {
    expect(najboljiURetku([2, 2], 'min')).toBeNull()
    expect(najboljiURetku([2, null], 'min')).toBeNull()
  })
})
