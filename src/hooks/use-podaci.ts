'use client'

import { useEffect, useState } from 'react'
import { pripremi, ucitajPodatke, type Pripremljeno } from '@/lib/data'

export type StanjePodataka =
  | { status: 'ucitavam' }
  | { status: 'greska'; greska: string }
  | { status: 'ok'; podaci: Pripremljeno }

// One fetch per page load, shared by every component that needs the data (hero, list, about).
let ucitavanje: Promise<StanjePodataka> | null = null

function ucitaj(): Promise<StanjePodataka> {
  ucitavanje ??= ucitajPodatke().then((r): StanjePodataka => {
    if (!r.ok) {
      ucitavanje = null // let a later mount retry
      return { status: 'greska', greska: r.greska }
    }
    try {
      return { status: 'ok', podaci: pripremi(r.podaci) }
    } catch (e) {
      console.error('usePodaci: preparing podaci.json failed', e)
      ucitavanje = null
      return { status: 'greska', greska: 'neispravni podaci' }
    }
  })
  return ucitavanje
}

export function usePodaci(): StanjePodataka {
  const [s, setS] = useState<StanjePodataka>({ status: 'ucitavam' })
  useEffect(() => {
    let ziv = true
    void ucitaj().then((r) => {
      if (ziv) setS(r)
    })
    return () => {
      ziv = false
    }
  }, [])
  return s
}
