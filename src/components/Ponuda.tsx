'use client'

import { ArrowDownIcon, ArrowUpIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Cip } from '@/components/Cip'
import { Detalj } from '@/components/Detalj'
import { Filteri } from '@/components/Filteri'
import { Kartica } from '@/components/Kartica'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { Trazilica } from '@/components/Trazilica'
import { UsporedbaDijalog, UsporedbaTraka } from '@/components/Usporedba'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SIROKO, useMediaQuery } from '@/hooks/use-media-query'
import { usePodaci } from '@/hooks/use-podaci'
import { usePonuda, type Ponuda as PonudaStanje } from '@/hooks/use-ponuda'
import { linkNekretnine, linkStranice, podijeli, preuzmi } from '@/lib/browser'
import { POGLEDI } from '@/lib/constants'
import { brojIzvoraUkupno, type Pripremljeno } from '@/lib/data'
import { ics } from '@/lib/deadlines'
import { prije } from '@/lib/format'
import { kodOznaka, sazetakUvoza } from '@/lib/marks'
import { REDOSLIJED_SORTA, SORTOVI, tekstSmjera, type SortKey } from '@/lib/sort'
import { cn } from '@/lib/utils'

function Pogledi({ x }: { x: PonudaStanje }) {
  return (
    <nav aria-label="Prikaz" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
      {POGLEDI.map(([k, t]) => (
        <button
          key={k}
          type="button"
          aria-pressed={x.stanje.pogled === k}
          onClick={() => x.akcije.postaviPogled(k)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-foreground aria-pressed:text-background"
        >
          {t}
          <span className="text-xs tabular-nums opacity-70">{x.brojPogleda[k]}</span>
        </button>
      ))}
    </nav>
  )
}

function Banner({ children, uloga = 'status' }: { children: React.ReactNode; uloga?: string }) {
  return (
    <div
      role={uloga}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-warn-soft px-4 py-3 text-sm"
    >
      {children}
    </div>
  )
}

async function podijeliOznake(x: PonudaStanje) {
  const kod = kodOznaka(x.oznake)
  if (!kod) {
    toast.info('Još nemaš oznaka')
    return
  }
  const broj = Object.keys(x.oznake).length
  await podijeli(
    'Nekretnine: moje oznake',
    `Moje oznake nekretnina (${broj}): otvori link i dodaj ih svojima.`,
    linkStranice('oznake=' + kod),
  )
}

function Sazetak({ x }: { x: PonudaStanje }) {
  const { lista, stanje, oznake, akcije } = x
  const veza = 'underline underline-offset-2 hover:text-foreground'
  return (
    <p aria-live="polite" className="text-sm text-muted-foreground">
      {lista.length} nekretnina
      {(stanje.pogled === 'favoriti' || stanje.pogled === 'odbaceno') &&
        Object.keys(oznake).length > 0 && (
          <>
            {' · '}
            <button type="button" className={veza} onClick={() => void podijeliOznake(x)}>
              podijeli moje oznake
            </button>
          </>
        )}
      {stanje.pogled === 'rokovi' && lista.length > 0 && (
        <>
          {' · po roku · '}
          <button
            type="button"
            className={veza}
            onClick={() =>
              preuzmi(
                'rokovi-nekretnine.ics',
                ics(lista, linkNekretnine, Date.now()),
                'text/calendar;charset=utf-8',
              )
            }
          >
            svi u kalendar (.ics)
          </button>
        </>
      )}
      {stanje.pogled === 'novo' && lista.length > 0 && (
        <>
          {' · '}
          <button
            type="button"
            className={veza}
            onClick={() => akcije.oznaciSveVidjeno(lista.map((n) => n.id))}
          >
            označi sve kao viđeno
          </button>
        </>
      )}
    </p>
  )
}

function SortKontrole({ x }: { x: PonudaStanje }) {
  const { stanje, akcije } = x
  const tekst = tekstSmjera(stanje.sort, stanje.smjer)
  const gore = tekst != null && tekst === SORTOVI[stanje.sort].t?.[0]
  return (
    <div className="flex items-center gap-2">
      <Select value={stanje.sort} onValueChange={(v) => akcije.postaviSort(v as SortKey)}>
        <SelectTrigger aria-label="Sortiraj" className="h-9 min-w-44 bg-card">
          <span className="text-muted-foreground" aria-hidden>
            Sortiraj:
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REDOSLIJED_SORTA.filter((k) => k !== 'relevantno' || stanje.trazi).map((k) => (
            <SelectItem key={k} value={k}>
              {SORTOVI[k].naziv}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {tekst && (
        <Button
          variant="outline"
          className="h-9 bg-card"
          aria-label={`Smjer sortiranja: ${tekst}. Klikni za obrnuto.`}
          onClick={akcije.obrniSmjer}
        >
          {gore ? <ArrowUpIcon /> : <ArrowDownIcon />}
          {tekst}
        </Button>
      )}
    </div>
  )
}

function Spremljene({ x }: { x: PonudaStanje }) {
  const { pretrage, upitBezPogleda, akcije } = x
  if (!pretrage.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-muted-foreground">Spremljeno:</span>
      {pretrage.map((p) => (
        <span key={p.naziv} className="inline-flex items-center">
          <Cip
            pritisnut={p.q === upitBezPogleda}
            onClick={() => akcije.primijeniPretragu(p.q)}
            className="rounded-r-none"
          >
            {p.naziv}
          </Cip>
          <button
            type="button"
            aria-label={`Obriši spremljenu pretragu ${p.naziv}`}
            onClick={() => akcije.obrisiPretragu(p.naziv)}
            className="grid min-h-9 place-items-center rounded-r-full border border-l-0 bg-card px-2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  )
}

function Aktivni({ x }: { x: PonudaStanje }) {
  const { aktivni, akcije } = x
  if (!aktivni.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {aktivni.map((a) => (
        <button
          key={a.kljuc}
          type="button"
          aria-label={`Makni filter ${a.tekst}`}
          onClick={() => akcije.promijeni(a.makni)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-sm text-primary hover:bg-primary/15"
        >
          {a.tekst}
          <XIcon aria-hidden className="size-3.5" />
        </button>
      ))}
      {aktivni.length > 1 && (
        <Button variant="link" className="h-8" onClick={akcije.ocisti}>
          Očisti sve
        </Button>
      )}
    </div>
  )
}

function Obavijesti({ x }: { x: PonudaStanje }) {
  const { uvoz, rokoviUskoro, stanje, akcije } = x
  return (
    <>
      {uvoz && (
        <Banner>
          {uvoz.plan.nove.length ? (
            <>
              <span>
                Netko ti je poslao oznake: {sazetakUvoza(uvoz.tude, uvoz.plan.nove)}.
                {uvoz.plan.razlicite.length > 0 &&
                  ` Za ${uvoz.plan.razlicite.length} imaš drukčiju oznaku i ona ostaje.`}
              </span>
              <span className="flex gap-2">
                <Button onClick={akcije.prihvatiUvoz}>Dodaj k mojima</Button>
                <Button variant="outline" onClick={akcije.odbijUvoz}>
                  Odustani
                </Button>
              </span>
            </>
          ) : (
            <>
              <span>
                {uvoz.plan.poznate.length
                  ? 'Sve oznake s ovog linka već imaš.'
                  : 'Link ne sadrži oznake koje postoje u trenutnom popisu.'}
              </span>
              <Button variant="outline" onClick={akcije.odbijUvoz}>
                U redu
              </Button>
            </>
          )}
        </Banner>
      )}
      {rokoviUskoro.length > 0 && stanje.pogled !== 'rokovi' && (
        <Banner>
          <span>
            {rokoviUskoro.length === 1
              ? '1 rok dražbe ili natječaja ističe u sljedećih 7 dana.'
              : `${rokoviUskoro.length} roka dražbi i natječaja ističu u sljedećih 7 dana.`}
          </span>
          <Button variant="outline" onClick={() => akcije.postaviPogled('rokovi')}>
            Pogledaj rokove
          </Button>
        </Banner>
      )}
    </>
  )
}

function Podnozje({ x }: { x: PonudaStanje }) {
  const { p, now } = x
  const aktivnih = p.nekretnine.filter((n) => n.aktivan).length
  const izvora = brojIzvoraUkupno(p)
  const los = p.izvori.filter((i) => !i.radi).map((i) => i.naziv)
  return (
    <footer className="mx-auto grid max-w-6xl gap-3 px-4 pt-8 pb-28 text-sm text-muted-foreground">
      <p>
        Osvježeno {prije(p.generirano, now)} ({p.generirano.slice(0, 16)}), {aktivnih} aktivnih
        nekretnina, {izvora} izvora{los.length ? `; trenutno ne radi: ${los.join(', ')}` : ''}.
      </p>
      <p>
        Podaci se skupljaju s javnih oglasa (portali, agencije, natječaji, dražbe) i mogu sadržavati
        greške. Uvijek provjeri izvorni oglas. Oznake (favorit, odbačeno) spremaju se samo u tvom
        pregledniku, a s drugom osobom ih dijeliš linkom{' '}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={() => void podijeliOznake(x)}
        >
          Podijeli moje oznake
        </button>
        .{' '}
        <Link href="/o-alatu/" className="underline underline-offset-2 hover:text-foreground">
          Kako radi i odakle su podaci
        </Link>
      </p>
      <ThemeSwitch className="justify-self-start" />
    </footer>
  )
}

function Sadrzaj({ p }: { p: Pripremljeno }) {
  const x = usePonuda(p)
  const { stanje, lista, prikazano, aktivni, akcije } = x
  const siroko = useMediaQuery(SIROKO)
  const [filteriOtvoreni, setFilteriOtvoreni] = useState(() => window.matchMedia(SIROKO).matches)
  const brojFiltera = aktivni.filter((a) => !a.pretraga).length
  const prikazi = lista.slice(0, prikazano)

  return (
    <>
      <header
        id="ponuda"
        className="sticky top-0 z-20 border-b bg-background/90 px-4 pt-3 pb-2 backdrop-blur supports-[backdrop-filter]:bg-background/75"
      >
        <div className="mx-auto grid max-w-6xl gap-2">
          <div className="flex items-center gap-2">
            <Trazilica x={x} />
            <Button
              variant="outline"
              className="h-11 rounded-full bg-card px-4"
              aria-expanded={filteriOtvoreni}
              aria-controls="filteri"
              onClick={() => setFilteriOtvoreni(!filteriOtvoreni)}
            >
              <SlidersHorizontalIcon />
              Filteri{brojFiltera ? ` (${brojFiltera})` : ''}
            </Button>
          </div>
          <Pogledi x={x} />
        </div>
      </header>

      {siroko ? (
        filteriOtvoreni && (
          <section id="filteri" aria-label="Filteri" className="border-b bg-card/60 px-4 py-5">
            <div className="mx-auto max-w-6xl">
              <Filteri x={x} />
            </div>
          </section>
        )
      ) : (
        <Sheet open={filteriOtvoreni} onOpenChange={setFilteriOtvoreni}>
          <SheetContent
            id="filteri"
            side="right"
            className="w-full gap-0 data-[side=right]:sm:max-w-md"
          >
            <SheetHeader className="border-b">
              <SheetTitle>Filteri</SheetTitle>
              <SheetDescription className="sr-only">Suzi popis nekretnina</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <Filteri x={x} />
            </div>
            <div className="border-t p-3">
              <Button className="h-11 w-full" onClick={() => setFilteriOtvoreni(false)}>
                {lista.length ? `Prikaži ${lista.length} nekretnina` : 'Nema rezultata'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <main className="mx-auto grid max-w-6xl gap-3 px-4 pt-4">
        <Spremljene x={x} />
        <Obavijesti x={x} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Sazetak x={x} />
          {stanje.pogled !== 'rokovi' && <SortKontrole x={x} />}
        </div>
        <Aktivni x={x} />
        {lista.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prikazi.map((n) => (
              <Kartica key={n.id} n={n} x={x} />
            ))}
          </div>
        ) : (
          <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
            <p>
              {stanje.pogled === 'novo' && !aktivni.length
                ? 'Sve si već pogledao. Novi oglasi stižu svakih sat vremena.'
                : 'Nema nekretnina za ove filtere.'}
            </p>
            {aktivni.length > 0 && (
              <Button variant="outline" onClick={akcije.ocisti}>
                Očisti filtere
              </Button>
            )}
          </div>
        )}
        {lista.length > prikazano && (
          <Button
            variant="outline"
            className="h-11 justify-self-center px-6"
            onClick={akcije.prikaziJos}
          >
            Prikaži još ({lista.length - prikazano})
          </Button>
        )}
      </main>

      <Podnozje x={x} />
      <div className={cn(!siroko && filteriOtvoreni && 'hidden')}>
        <UsporedbaTraka x={x} />
      </div>
      <Detalj x={x} />
      <UsporedbaDijalog x={x} />
    </>
  )
}

/** The list page below the hero. Browser-only (see PonudaLoader). */
export function Ponuda() {
  const s = usePodaci()
  if (s.status !== 'ok') {
    return (
      <p className="mx-auto max-w-6xl px-4 py-10 text-muted-foreground" aria-live="polite">
        {s.status === 'ucitavam'
          ? 'Učitavam…'
          : `Podaci se nisu učitali (${s.greska}). Pokušaj osvježiti stranicu.`}
      </p>
    )
  }
  return <Sadrzaj p={s.podaci} />
}
