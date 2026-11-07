'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Ponuda } from '@/hooks/use-ponuda'
import { kopirajLink } from '@/lib/browser'
import { izracun, jeNovogradnja } from '@/lib/calculator'
import { MAX_USPOREDBA, VRSTE } from '@/lib/constants'
import type { Nek } from '@/lib/data'
import { rokTekst } from '@/lib/deadlines'
import {
  brojIzvora,
  danaNaTrzistu,
  dana,
  eur,
  katTekst,
  m2,
  mjestoPrikaz,
  tis,
  zarez,
} from '@/lib/format'
import { najboljiURetku } from '@/lib/compare'
import { imaZelja } from '@/lib/wishes'
import { cn } from '@/lib/utils'

/** Floating bar while 1-4 listings are picked for comparison. */
export function UsporedbaTraka({ x }: { x: Ponuda }) {
  const { usporedbaIds: ids, akcije } = x
  if (!ids.length) return null
  return (
    <div className="fixed inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex justify-center px-3">
      <div className="flex items-center gap-2 rounded-full border bg-popover py-1.5 pr-1.5 pl-4 shadow-lg">
        <span className="text-sm">
          {ids.length === 1
            ? 'Odaberi još jednu (⇄)'
            : `Usporedba: ${ids.length}${ids.length === MAX_USPOREDBA ? '/4' : ''}`}
        </span>
        <Button
          className="rounded-full"
          disabled={ids.length < 2}
          onClick={() => akcije.otvoriUsporedbu(ids)}
        >
          Usporedi
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          aria-label="Očisti usporedbu"
          onClick={akcije.ocistiUsporedbu}
        >
          Očisti
        </Button>
      </div>
    </div>
  )
}

type Redak = {
  naziv: string
  prikaz: (n: Nek, i: number) => ReactNode
  /** numeric value to find the best one in the row */
  broj?: (n: Nek, i: number) => number | null | undefined
  bolje?: 'min' | 'max'
}

function Tablica({ lista, x }: { lista: Nek[]; x: Ponuda }) {
  const { kalk: k, zelje, moja, now, p, akcije, usporedbaIds } = x
  const calc = lista.map((n) => izracun(n, k, jeNovogradnja(n)))
  const redovi: Redak[] = [
    {
      naziv: 'Cijena',
      prikaz: (n) => eur(n.cijena) || 'na upit',
      broj: (n) => n.cijena,
      bolje: 'min',
    },
    {
      naziv: 'Cijena po m²',
      prikaz: (n) => (n.eur_m2 ? tis(n.eur_m2) + ' €' : '–'),
      broj: (n) => n.eur_m2,
      bolje: 'min',
    },
    {
      naziv: 'Prema prosjeku',
      prikaz: (n) =>
        n.vs_prosjek == null ? '–' : (n.vs_prosjek > 0 ? '+' : '−') + Math.abs(n.vs_prosjek) + ' %',
      broj: (n) => n.vs_prosjek,
      bolje: 'min',
    },
    { naziv: 'Vrsta', prikaz: (n) => VRSTE[n.vrsta] || n.vrsta },
    { naziv: 'Mjesto', prikaz: (n) => mjestoPrikaz(n) || n.opcina },
    {
      naziv: 'Površina',
      prikaz: (n) => m2(n.povrsina) || '–',
      broj: (n) => (n.vrsta === 'zemljiste' ? null : n.povrsina),
      bolje: 'max',
    },
    {
      naziv: 'Okućnica / zemljište',
      prikaz: (n) => m2(n.zemljiste) || '–',
      broj: (n) => n.zemljiste,
      bolje: 'max',
    },
    {
      naziv: 'Sobe',
      prikaz: (n) => (n.sobe ? zarez(n.sobe) : '–'),
      broj: (n) => n.sobe,
      bolje: 'max',
    },
    { naziv: 'Kat', prikaz: (n) => katTekst(n) || '–' },
    {
      naziv: 'Ima (iz opisa)',
      prikaz: (n) => n.znacajke.map((z) => p.znacajke[z] || z).join(', ') || '–',
    },
    {
      naziv: 'Na tržištu',
      prikaz: (n) => {
        const d = danaNaTrzistu(n, now)
        return d == null ? '–' : `${d} ${dana(d)}`
      },
    },
    {
      naziv: 'Pad cijene (30 dana)',
      prikaz: (n) => (n.pad ? `−${zarez(n.pad.posto)} %` : '–'),
      broj: (n) => n.pad?.posto,
      bolje: 'max',
    },
    {
      naziv: 'Troškovi kupnje',
      prikaz: (_, i) => (calc[i] ? eur(calc[i].troskovi) : '–'),
      broj: (_, i) => calc[i]?.troskovi,
      bolje: 'min',
    },
    {
      naziv: 'Gotovine odmah',
      prikaz: (_, i) => (calc[i] ? eur(calc[i].gotovina) : '–'),
      broj: (_, i) => calc[i]?.gotovina,
      bolje: 'min',
    },
    {
      naziv: `Rata (${k.godina} god., ${zarez(k.kamata)} %)`,
      prikaz: (_, i) => (calc[i] ? eur(calc[i].rata) + '/mj.' : '–'),
      broj: (_, i) => calc[i]?.rata,
      bolje: 'min',
    },
    {
      naziv: 'Ocjena ponude',
      prikaz: (n) => String(n.ocjena),
      broj: (n) => n.ocjena,
      bolje: 'max',
    },
  ]
  if (imaZelja(zelje)) {
    redovi.push({
      naziv: 'Odgovara ti',
      prikaz: (n) => moja(n).ocjena + ' %',
      broj: (n) => moja(n).ocjena,
      bolje: 'max',
    })
  }
  redovi.push(
    {
      naziv: 'Prodaje',
      prikaz: (n) =>
        n.nacin === 'drazba'
          ? 'dražba'
          : n.nacin === 'natjecaj'
            ? 'natječaj'
            : n.agencija || (n.prodavac === 'agencija' ? 'agencija' : 'privatno / nepoznato'),
    },
    { naziv: 'Rok', prikaz: (n) => rokTekst(n, now) || '–' },
    { naziv: 'Izvora', prikaz: (n) => String(brojIzvora(n)) },
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-popover">
              <span className="sr-only">Svojstvo</span>
            </th>
            {lista.map((n) => (
              <th
                key={n.id}
                scope="col"
                className="w-48 max-w-48 p-2 text-left align-top font-normal"
              >
                {n.slika && (
                  <img
                    src={n.slika}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => e.currentTarget.remove()}
                    className="mb-1.5 aspect-[16/10] w-full rounded-lg object-cover"
                  />
                )}
                <a
                  href={`#n=${encodeURIComponent(n.id)}`}
                  className="line-clamp-2 font-medium hover:underline"
                >
                  {n.naslov || `${VRSTE[n.vrsta]}, ${mjestoPrikaz(n)}`}
                </a>
                <button
                  type="button"
                  aria-label="Makni iz usporedbe"
                  className="mt-1 text-xs text-muted-foreground underline"
                  onClick={() => {
                    const ost = usporedbaIds.filter((id) => id !== n.id)
                    akcije.prebaciUsporedbu(n.id)
                    if (ost.length) akcije.otvoriUsporedbu(ost)
                    else akcije.zatvori()
                  }}
                >
                  Makni
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {redovi.map((r) => {
            const vrij = r.broj ? lista.map(r.broj) : []
            const naj = r.bolje ? najboljiURetku(vrij, r.bolje) : null
            return (
              <tr key={r.naziv}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-32 border-t bg-popover p-2 text-left font-medium"
                >
                  {r.naziv}
                </th>
                {lista.map((n, i) => (
                  <td
                    key={n.id}
                    className={cn(
                      'border-t p-2 align-top tabular-nums',
                      naj != null && vrij[i] === naj && 'bg-good-soft font-semibold text-good',
                    )}
                  >
                    {r.prikaz(n, i)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Comparison table, deep link `#usporedi=id1,id2`. */
export function UsporedbaDijalog({ x }: { x: Ponuda }) {
  const { usporediOtvoreno, usporediIds, p, kalk, akcije } = x
  const lista = usporediIds.flatMap((id) => {
    const n = p.poId.get(id)
    return n ? [n] : []
  })
  const otvoreno = usporediOtvoreno && lista.length > 0
  return (
    <Dialog open={otvoreno} onOpenChange={(o) => !o && akcije.zatvori()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-5xl"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-popover/95 px-4 py-3 backdrop-blur">
          <DialogTitle className="text-lg font-semibold">Usporedba ({lista.length})</DialogTitle>
          <Button variant="outline" onClick={akcije.zatvori}>
            Zatvori
          </Button>
        </div>
        <DialogDescription className="sr-only">Usporedba odabranih nekretnina</DialogDescription>
        {otvoreno && <Tablica lista={lista} x={x} />}
        <div className="grid gap-3 p-4">
          <p className="text-xs text-muted-foreground">
            Zeleno je najbolja vrijednost u retku. Troškovi i rata računaju se s postavkama iz
            kalkulatora (učešće {kalk.ucesce} %, kamata {zarez(kalk.kamata)} %, {kalk.godina} god.),
            a mijenjaju se u detaljima nekretnine.
          </p>
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={() => void kopirajLink(location.href)}
          >
            Kopiraj link usporedbe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
