'use client'

import { useSyncExternalStore } from 'react'

export function useMediaQuery(upit: string): boolean {
  return useSyncExternalStore(
    (javi) => {
      const m = window.matchMedia(upit)
      m.addEventListener('change', javi)
      return () => m.removeEventListener('change', javi)
    },
    () => window.matchMedia(upit).matches,
    () => false,
  )
}

/** The old site's breakpoint: filters sit beside the list from 900px. */
export const SIROKO = '(min-width: 900px)'
