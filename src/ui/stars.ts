/** Speed Trial Stars as ⭐⭐☆. */
export function starText(stars: number): string {
  return '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars))
}
