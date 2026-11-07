'use client'

import { ArrowLeftRightIcon, StarIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dijelovi, Oznaceno } from '@/components/Oznaceno'
import { ProsjekZnacka } from '@/components/ProsjekZnacka'
import { Slika } from '@/components/Slika'
import type { Ponuda } from '@/hooks/use-ponuda'
import { OZNAKE, VRSTE } from '@/lib/constants'
import type { Nek } from '@/lib/data'
import { danaDoRoka, rokTekst } from '@/lib/deadlines'
import {
  eur,
  jeUdio,
  katTekst,
  m2,
  mjestoPrikaz,
  naziviIzvora,
  prije,
  sobeTekst,
} from '@/lib/format'
import { isjecak } from '@/lib/search'
import { istaknuto } from '@/lib/sort'
import { cn } from '@/lib/utils'

export function cinjenice(n: Nek): string {
  return [
    VRSTE[n.vrsta] || n.vrsta,
    mjestoPrikaz(n),
    m2(n.povrsina),
    sobeTekst(n.sobe),
    katTekst(n),
    n.zemljiste ? 'zemljište ' + m2(n.zemljiste) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function Znacka({ children, ton }: { children: ReactNode; ton?: 'dobro' | 'upoz' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm',
        ton === 'dobro'
          ? 'bg-good-soft text-good'
          : ton === 'upoz'
            ? 'bg-warn-soft text-foreground'
            : 'bg-card text-foreground',
      )}
    >
      {children}
    </span>
  )
}

function Ikona({
  pritisnut,
  oznaka,
  onClick,
  children,
}: {
  pritisnut: boolean
  oznaka: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pritisnut}
      aria-label={oznaka}
      title={oznaka}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="grid size-9 place-items-center rounded-full border bg-card text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
    >
      {children}
    </button>
  )
}

export function Kartica({ n, x }: { n: Nek; x: Ponuda }) {
  const { oznake, vidjeno, upiti, now, sort, smjer, sortCtx, usporedbaIds, akcije } = x
  const o = oznake[n.id]
  const cinj = cinjenice(n)
  const ist = istaknuto(n, sort, smjer, sortCtx)
  const rok = rokTekst(n, now)
  const dana = danaDoRoka(n, now)
  const isj = upiti.length ? isjecak(n.opis, n._no, upiti) : null
  const otvori = () => akcije.otvori(n.id)

  return (
    <article
      tabIndex={0}
      aria-label={`${cinj}, ${eur(n.cijena) || 'cijena na upit'}`}
      onClick={otvori}
      onKeyDown={(e) => {
        if (e.key === 'Enter') otvori()
      }}
      className={cn(
        'flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
        o === 'odbaceno' && 'opacity-60',
      )}
    >
      <div className="relative">
        <Slika key={n.slika} src={n.slika} malo className="aspect-[16/10]" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {!vidjeno[n.id] && n.aktivan && <Znacka ton="dobro">Novo</Znacka>}
          {n.nacin !== 'oglas' && (
            <Znacka ton="upoz">{n.nacin === 'drazba' ? 'Dražba' : 'Natječaj'}</Znacka>
          )}
          {jeUdio(n) && <Znacka ton="upoz">{n.predmet === 'udio?' ? 'Možda udio' : 'Udio'}</Znacka>}
          {!n.aktivan && <Znacka>Nestao</Znacka>}
          {o && <Znacka>{OZNAKE[o]}</Znacka>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold tabular-nums">
            {eur(n.cijena) || 'Cijena na upit'}
          </span>
          {n.eur_m2 ? (
            <span className="text-sm text-muted-foreground tabular-nums">
              {n.eur_m2.toLocaleString('hr-HR')} €/m²
            </span>
          ) : null}
          <ProsjekZnacka n={n} />
        </div>
        <div className="text-sm text-muted-foreground">{cinj}</div>
        {ist && (
          <span className={cn('text-sm font-medium', ist.dobro ? 'text-good' : 'text-primary')}>
            {ist.tekst}
          </span>
        )}
        {rok && (
          <span
            className={cn(
              'text-sm font-medium',
              dana != null && dana <= 3 ? 'text-destructive' : 'text-foreground',
            )}
          >
            {rok}
          </span>
        )}
        <div className="line-clamp-2 font-medium">
          <Oznaceno tekst={n.naslov} upiti={upiti} />
        </div>
        {isj && (
          <div className="line-clamp-3 text-sm text-muted-foreground">
            {isj.pocetak && '…'}
            <Dijelovi dijelovi={isj.dijelovi} />
            {isj.kraj && '…'}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span className="min-w-0 text-xs text-muted-foreground">
            {prije(n.od, now)} · {naziviIzvora(n).join(', ')}
          </span>
          <span className="flex shrink-0 gap-1.5">
            <Ikona
              pritisnut={usporedbaIds.includes(n.id)}
              oznaka="Usporedi"
              onClick={() => akcije.prebaciUsporedbu(n.id)}
            >
              <ArrowLeftRightIcon className="size-4" />
            </Ikona>
            <Ikona
              pritisnut={o === 'favorit'}
              oznaka="Favorit"
              onClick={() => akcije.oznaci(n.id, 'favorit')}
            >
              <StarIcon className="size-4" />
            </Ikona>
            <Ikona
              pritisnut={o === 'odbaceno'}
              oznaka="Odbaci"
              onClick={() => akcije.oznaci(n.id, 'odbaceno')}
            >
              <XIcon className="size-4" />
            </Ikona>
          </span>
        </div>
      </div>
    </article>
  )
}
