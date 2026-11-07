'use client'

import { useCallback, useRef, useState } from 'react'
import { citaj, pisi } from '@/lib/storage'

/**
 * State mirrored to localStorage under `kljuc`. Reads once on mount, so the component must only
 * render in the browser (the list is loaded with ssr: false). `procitaj` validates the stored
 * value; anything it cannot use falls back to its default.
 */
export function useStored<T>(kljuc: string, procitaj: (spremljeno: unknown) => T) {
  const [v, setV] = useState<T>(() => procitaj(citaj<unknown>(kljuc, null)))
  const zadnje = useRef(v)
  const postavi = useCallback(
    (novo: T | ((staro: T) => T)) => {
      const val = typeof novo === 'function' ? (novo as (s: T) => T)(zadnje.current) : novo
      zadnje.current = val
      pisi(kljuc, val)
      setV(val)
    },
    [kljuc],
  )
  return [v, postavi] as const
}
