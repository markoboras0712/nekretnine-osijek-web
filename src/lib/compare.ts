/**
 * The best value in a comparison row (green): needs at least two known values that differ.
 * Returns the value itself, so ties are all highlighted.
 */
export function najboljiURetku(
  vrijednosti: readonly (number | null | undefined)[],
  bolje: 'min' | 'max',
): number | null {
  const poznate = vrijednosti.filter((v): v is number => v != null && !Number.isNaN(v))
  if (poznate.length < 2) return null
  const min = Math.min(...poznate)
  const max = Math.max(...poznate)
  if (min === max) return null
  return bolje === 'min' ? min : max
}
