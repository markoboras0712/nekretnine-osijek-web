'use client'

import dynamic from 'next/dynamic'

// The list depends on localStorage, the URL and the fetched data, so it renders only in the
// browser; the hero around it is prerendered.
const Ponuda = dynamic(() => import('@/components/Ponuda').then((m) => m.Ponuda), {
  ssr: false,
  loading: () => (
    <p className="mx-auto max-w-6xl px-4 py-10 text-muted-foreground" aria-live="polite">
      Učitavam…
    </p>
  ),
})

export function PonudaLoader() {
  return <Ponuda />
}
