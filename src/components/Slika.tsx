'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Listing photo, hotlinked without a referrer; a text placeholder when missing or broken. */
export function Slika({
  src,
  malo,
  className,
}: {
  src: string
  malo?: boolean
  className?: string
}) {
  const [greska, setGreska] = useState(false)
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {src && !greska ? (
        <img
          src={src}
          alt=""
          loading={malo ? 'lazy' : 'eager'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setGreska(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-sm text-muted-foreground">
          {src ? 'Fotografija nije dostupna' : 'Bez fotografije'}
        </div>
      )}
    </div>
  )
}
