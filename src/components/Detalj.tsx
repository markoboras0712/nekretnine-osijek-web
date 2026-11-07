'use client'

import { Kalkulator } from '@/components/Kalkulator'
import { Oznaceno } from '@/components/Oznaceno'
import { ProsjekZnacka } from '@/components/ProsjekZnacka'
import { Slika } from '@/components/Slika'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Ponuda } from '@/hooks/use-ponuda'
import { linkNekretnine, preuzmi } from '@/lib/browser'
import { OZNAKE, VRSTE, type Oznaka } from '@/lib/constants'
import type { Nek } from '@/lib/data'
import { danaDoRoka, ics, rokTekst } from '@/lib/deadlines'
import { datumHr, eur, jeUdio, katTekst, m2, prije, zarez } from '@/lib/format'
import { imaZelja } from '@/lib/wishes'
import { cn } from '@/lib/utils'

function Upozorenje({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-warn-soft p-3 text-sm">{children}</div>
}

function Sadrzaj({ n, x }: { n: Nek; x: Ponuda }) {
  const { p, oznake, upiti, now, zelje, moja, kalk, usporedbaIds, akcije } = x
  const o = oznake[n.id]
  const prosjek =
    p.prosjeci[`${n.naselje || ''}|${n.vrsta}`] ?? p.prosjeci[`${n.opcina || ''}|${n.vrsta}`]
  const gdje =
    n.opcina === 'Osijek' && n.kvart && n.kvart !== n.naselje
      ? `Osijek, ${n.kvart}`
      : n.naselje || n.opcina || ''
  const brojke: [string, string][] = [
    [m2(n.povrsina) || '–', 'površina'],
    [m2(n.zemljiste) || '–', 'zemljište / okućnica'],
    [n.eur_m2 ? n.eur_m2.toLocaleString('hr-HR') + ' €' : '–', 'po m²'],
    [
      prosjek ? prosjek[0].toLocaleString('hr-HR') + ' €' : '–',
      `prosjek po m² (${prosjek ? prosjek[1] + ' oglasa' : 'premalo oglasa'})`,
    ],
  ]
  if (n.vrsta === 'stan' || n.vrsta === 'kuca')
    brojke.push([n.sobe ? zarez(n.sobe) : '–', 'broj soba'])
  if (n.vrsta === 'stan') brojke.push([katTekst(n) || '–', 'kat'])
  brojke.push([prije(n.od, now) || '–', 'na tržištu'], [String(n.ocjena), 'ocjena ponude'])
  const zn = n.znacajke.map((z) => p.znacajke[z] || z)
  const rok = rokTekst(n, now)
  const dana = danaDoRoka(n, now)
  const m = imaZelja(zelje) ? moja(n) : null
  const uUsporedbi = usporedbaIds.includes(n.id)
  const telefon = n.telefon.replace(/^\+/, '')
  const mapa = [...new Set([n.kvart, n.naselje, n.opcina].filter(Boolean))].join(', ')

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-popover/95 px-4 py-3 backdrop-blur">
        <DialogTitle className="text-lg font-semibold">
          {VRSTE[n.vrsta] || 'Nekretnina'}, {gdje}
        </DialogTitle>
        <Button variant="outline" onClick={akcije.zatvori}>
          Zatvori
        </Button>
      </div>
      <DialogDescription className="sr-only">Detalji nekretnine</DialogDescription>
      <div className="grid gap-4 p-4">
        <Slika key={n.slika} src={n.slika} className="aspect-[16/10] rounded-xl" />
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {eur(n.cijena) || 'Cijena na upit'}
          </span>
          <ProsjekZnacka n={n} />
        </div>
        <div className="font-medium">
          <Oznaceno tekst={n.naslov} upiti={upiti} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {brojke.map(([b, t]) => (
            <div key={t} className="rounded-xl border p-2.5">
              <b className="block tabular-nums">{b}</b>
              <span className="text-xs text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
        {zn.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">U opisu piše:</span>
            {zn.map((z) => (
              <span key={z} className="rounded-full bg-muted px-2.5 py-0.5">
                {z}
              </span>
            ))}
          </div>
        )}
        {n.nacin !== 'oglas' && (
          <Upozorenje>
            {n.nacin === 'drazba' ? 'Dražba' : 'Javni natječaj'}
            {rok ? ', ' + rok.replace(/ · jamčevina.*/, '') : n.rok ? ', rok ' + n.rok : ''}
            {n.jamcevina ? ', jamčevina ' + eur(n.jamcevina) : ''}. Uvjete, rokove i jamčevinu
            uvijek provjeri u izvornom dokumentu.
          </Upozorenje>
        )}
        {!n.aktivan && (
          <Upozorenje>Oglas više nije objavljen (vjerojatno prodano ili povučeno).</Upozorenje>
        )}
        {jeUdio(n) && (
          <Upozorenje>
            {n.predmet === 'udio?'
              ? 'Možda se prodaje samo suvlasnički udio, a ne cijela nekretnina. Provjeri u oglasu.'
              : 'Prodaje se suvlasnički udio, a ne cijela nekretnina. Cijena je za taj dio.'}
          </Upozorenje>
        )}
        {m && (
          <div className="rounded-xl bg-good-soft p-3 text-sm">
            <b>Odgovara ti {m.ocjena} %</b>
            {m.zasto.length > 0 && <span> · {m.zasto.join(', ')}</span>}
          </div>
        )}
        {n.cijene.length > 1 && (
          <div>
            <b>Povijest cijene</b>
            <ul className="mt-1 grid gap-0.5 text-sm">
              {[...n.cijene].reverse().map(([d, c], i) => (
                <li key={i} className="flex justify-between border-b border-dashed py-1">
                  <span>{datumHr(d)}</span>
                  <span className="tabular-nums">{eur(c)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Kalkulator key={n.id} n={n} kalk={kalk} postaviKalk={akcije.postaviKalk} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(OZNAKE) as Oznaka[]).map((k) => (
            <Button
              key={k}
              variant={o === k ? 'default' : 'outline'}
              aria-pressed={o === k}
              className="h-10"
              onClick={() => akcije.oznaci(n.id, k)}
            >
              {OZNAKE[k]}
            </Button>
          ))}
        </div>
        <ul className="grid gap-1.5">
          {n.izvori.map((i, k) => (
            <li key={k}>
              <a
                href={i.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm hover:bg-muted"
              >
                <span>Otvori na: {i.naziv}</span>
                <span
                  className={cn('tabular-nums', !i.aktivan && 'text-muted-foreground line-through')}
                >
                  {i.aktivan ? eur(i.cijena) : 'nestao'}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            aria-pressed={uUsporedbi}
            className="h-10"
            onClick={() => akcije.prebaciUsporedbu(n.id)}
          >
            {uUsporedbi ? 'U usporedbi (makni)' : 'Dodaj u usporedbu'}
          </Button>
          {dana != null && dana >= 0 && (
            <Button
              variant="outline"
              className="h-10"
              onClick={() =>
                preuzmi(
                  `rok-${n.id}.ics`,
                  ics([n], linkNekretnine, Date.now()),
                  'text/calendar;charset=utf-8',
                )
              }
            >
              Dodaj rok u kalendar (.ics)
            </Button>
          )}
          {telefon && (
            <Button variant="outline" className="h-10" asChild>
              <a href={`tel:+${telefon}`}>Nazovi +{telefon}</a>
            </Button>
          )}
          <Button variant="outline" className="h-10" asChild>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(mapa + ', Hrvatska')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pogledaj mjesto na karti
            </a>
          </Button>
        </div>
        {(n.agencija || n.prodavac) && (
          <p className="text-sm text-muted-foreground">
            Prodavač: {[n.prodavac, n.agencija].filter(Boolean).join(', ')}
          </p>
        )}
        {n.razlozi && (
          <p className="text-sm text-muted-foreground">Zašto ova ocjena: {n.razlozi}</p>
        )}
        {n.opis && (
          <div className="text-sm leading-relaxed whitespace-pre-line">
            <Oznaceno tekst={n.opis} normaliziran={n._no} upiti={upiti} />
          </div>
        )}
      </div>
    </>
  )
}

/** Listing detail; deep link `#n=<id>`. */
export function Detalj({ x }: { x: Ponuda }) {
  const n = x.detalj
  return (
    <Dialog open={!!n} onOpenChange={(o) => !o && x.akcije.zatvori()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        {n && <Sadrzaj n={n} x={x} />}
      </DialogContent>
    </Dialog>
  )
}
