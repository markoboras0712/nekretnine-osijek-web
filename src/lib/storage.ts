/** localStorage that never throws (private mode, quota, disabled storage). */

export function citaj<T>(kljuc: string, zadano: T): T {
  try {
    const v = localStorage.getItem(kljuc)
    return v ? (JSON.parse(v) as T) : zadano
  } catch (e) {
    console.warn('citaj: localStorage unavailable or value corrupt', kljuc, e)
    return zadano
  }
}

export function pisi(kljuc: string, v: unknown): void {
  try {
    localStorage.setItem(kljuc, JSON.stringify(v))
  } catch (e) {
    console.warn('pisi: localStorage unavailable', kljuc, e)
  }
}
