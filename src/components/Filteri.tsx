'use client'

import { useState, type ReactNode } from 'react'
import { Cip } from '@/components/Cip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Ponuda } from '@/hooks/use-ponuda'
import { kopirajLink } from '@/lib/browser'
import { BRZO, CIJENE_BRZO, IZBJEGAVAM, KAT, SOBE, VRSTE, ZELJE } from '@/lib/constants'
import { mjestaZaCipove, prebaci, type Broj, type Lista } from '@/lib/filters'
import { sljedecaTezina } from '@/lib/wishes'
import { cn } from '@/lib/utils'

function Polje({
  naslov,
  napomena,
  siroko,
  children,
}: {
  naslov: string
  napomena?: ReactNode
  siroko?: boolean
  children: ReactNode
}) {
  return (
    <fieldset className={cn('grid min-w-0 gap-2', siroko && 'md:col-span-2')}>
      <legend className="mb-2 text-sm font-semibold">
        {naslov}{' '}
        {napomena && <small className="font-normal text-muted-foreground">{napomena}</small>}
      </legend>
      {children}
    </fieldset>
  )
}

function Cipovi({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

function BrojPolje({
  x,
  k,
  natpis,
  placeholder,
  korak,
  skriveniNatpis,
}: {
  x: Ponuda
  k: Broj
  natpis: string
  placeholder: string
  korak: number
  skriveniNatpis?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className={cn('text-muted-foreground', skriveniNatpis && 'sr-only')}>{natpis}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={korak}
        placeholder={placeholder}
        value={x.stanje[k]}
        onChange={(e) => {
          const v = e.target.value.trim()
          x.akcije.promijeni((s) => ({ ...s, [k]: v }))
        }}
        className="h-10"
      />
    </label>
  )
}

/** Every filter group; chips show live counts. Used in the desktop panel and the phone sheet. */
export function Filteri({ x }: { x: Ponuda }) {
  const { stanje: st, cipovi, p, zelje, akcije } = x
  const [svaMjesta, setSvaMjesta] = useState(false)
  const [naziv, setNaziv] = useState('')
  const prebaciU = (polje: Lista, v: string) =>
    akcije.promijeni((s) => ({ ...s, [polje]: prebaci(s[polje], v) }))

  const mjesta = mjestaZaCipove(cipovi.mjesta, st.mjesta)
  const vidljiva = svaMjesta ? mjesta : mjesta.filter((m, i) => i < 12 || st.mjesta.includes(m))
  const stambeno = !st.vrste.length || st.vrste.includes('stan') || st.vrste.includes('kuca')
  const stanovi = !st.vrste.length || st.vrste.includes('stan')
  const znacajke = Object.keys(p.znacajke).sort(
    (a, b) => (cipovi.zn.get(b) || 0) - (cipovi.zn.get(a) || 0),
  )
  const pozitivne: [string, string][] = [
    ...ZELJE,
    ...Object.keys(p.znacajke)
      .filter((k) => k !== 'adaptacija')
      .map((k): [string, string] => [k, p.znacajke[k] as string]),
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Polje naslov="Vrsta">
        <Cipovi>
          {Object.entries(VRSTE).map(([k, t]) => (
            <Cip
              key={k}
              pritisnut={st.vrste.includes(k)}
              broj={cipovi.vrste.get(k) || 0}
              onClick={() => prebaciU('vrste', k)}
            >
              {t}
            </Cip>
          ))}
        </Cipovi>
      </Polje>

      <Polje naslov="Općina">
        <Cipovi>
          {Object.keys(p.podrucje).map((o) => (
            <Cip
              key={o}
              pritisnut={st.opcine.includes(o)}
              broj={cipovi.opcine.get(o) || 0}
              onClick={() => prebaciU('opcine', o)}
            >
              {o}
            </Cip>
          ))}
        </Cipovi>
      </Polje>

      <Polje naslov="Kvart / naselje" siroko>
        <Cipovi>
          {vidljiva.map((m) => (
            <Cip
              key={m}
              pritisnut={st.mjesta.includes(m)}
              broj={cipovi.mjesta.get(m) || 0}
              onClick={() => prebaciU('mjesta', m)}
            >
              {m}
            </Cip>
          ))}
          {(mjesta.length > vidljiva.length || svaMjesta) && (
            <Cip pritisnut={false} onClick={() => setSvaMjesta(!svaMjesta)}>
              {svaMjesta ? 'Manje' : `Još ${mjesta.length - vidljiva.length}…`}
            </Cip>
          )}
        </Cipovi>
      </Polje>

      <Polje naslov="Cijena" siroko>
        <Cipovi>
          {CIJENE_BRZO.map(([t, od, do_], i) => {
            const ukljucen = st.cmin === od && st.cmax === do_
            return (
              <Cip
                key={t}
                pritisnut={ukljucen}
                broj={cipovi.cijene[i] ?? 0}
                onClick={() =>
                  akcije.promijeni((s) => ({
                    ...s,
                    cmin: ukljucen ? '' : od,
                    cmax: ukljucen ? '' : do_,
                  }))
                }
              >
                {t}
              </Cip>
            )
          })}
        </Cipovi>
        <div className="grid max-w-sm grid-cols-2 gap-2">
          <BrojPolje
            x={x}
            k="cmin"
            natpis="Cijena od €"
            placeholder="od €"
            korak={10000}
            skriveniNatpis
          />
          <BrojPolje
            x={x}
            k="cmax"
            natpis="Cijena do €"
            placeholder="do €"
            korak={10000}
            skriveniNatpis
          />
        </div>
      </Polje>

      {(stambeno || st.sobe.length > 0) && (
        <Polje naslov="Broj soba" napomena="(stanovi i kuće gdje piše)">
          <Cipovi>
            {SOBE.map(([k, t]) => (
              <Cip
                key={k}
                pritisnut={st.sobe.includes(k)}
                broj={cipovi.sobe.get(k) || 0}
                onClick={() => prebaciU('sobe', k)}
              >
                {t}
              </Cip>
            ))}
          </Cipovi>
        </Polje>
      )}

      {(stanovi || st.kat.length > 0) && (
        <Polje naslov="Kat" napomena="(stanovi)">
          <Cipovi>
            {KAT.map(([k, t]) => (
              <Cip
                key={k}
                pritisnut={st.kat.includes(k)}
                broj={cipovi.kat.get(k) || 0}
                onClick={() => prebaciU('kat', k)}
              >
                {t}
              </Cip>
            ))}
          </Cipovi>
        </Polje>
      )}

      <Polje naslov="Ima" napomena="(iz opisa oglasa)" siroko>
        <Cipovi>
          {znacajke.map((k) => (
            <Cip
              key={k}
              pritisnut={st.zn.includes(k)}
              broj={cipovi.zn.get(k) || 0}
              onClick={() => prebaciU('zn', k)}
            >
              {p.znacajke[k]}
            </Cip>
          ))}
        </Cipovi>
      </Polje>

      <Polje naslov="Brzo" siroko>
        <Cipovi>
          {BRZO.map(([k, t]) => (
            <Cip
              key={k}
              pritisnut={st.brzo.includes(k)}
              broj={cipovi.brzo.get(k) || 0}
              onClick={() => prebaciU('brzo', k)}
            >
              {t}
            </Cip>
          ))}
        </Cipovi>
      </Polje>

      <Polje naslov="Površina i cijena po m²" siroko>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BrojPolje x={x} k="pmin" natpis="Površina od m²" placeholder="bilo koja" korak={10} />
          <BrojPolje x={x} k="pmax" natpis="Površina do m²" placeholder="bilo koja" korak={10} />
          <BrojPolje x={x} k="zmin" natpis="Zemljište od m²" placeholder="bilo koje" korak={100} />
          <BrojPolje x={x} k="m2max" natpis="€/m² do" placeholder="bilo koja" korak={100} />
        </div>
      </Polje>

      <Polje
        naslov="Što ti je važno?"
        napomena={
          <>
            Klik = važno ★, dva klika = jako važno ★★. Sortira se „Po mojim željama”, a spremljeno
            je samo u ovom pregledniku, pa svatko može imati svoje.
          </>
        }
        siroko
      >
        <Cipovi>
          {pozitivne.map(([k, t]) => {
            const w = zelje[k] || 0
            return (
              <Cip
                key={k}
                pritisnut={w > 0}
                title={
                  w === 2
                    ? 'Jako važno (klikni za isključiti)'
                    : w === 1
                      ? 'Važno (klikni za jako važno)'
                      : 'Klikni ako ti je važno'
                }
                onClick={() => akcije.postaviZelju(k, sljedecaTezina(w > 0 ? w : 0))}
              >
                {t}
                {w > 0 && (
                  <span aria-label={w === 2 ? 'jako važno' : 'važno'}>{w === 2 ? '★★' : '★'}</span>
                )}
              </Cip>
            )
          })}
        </Cipovi>
        <span className="mt-1 text-sm font-semibold">Izbjegavam</span>
        <Cipovi>
          {IZBJEGAVAM.map(([k, t]) => {
            const w = zelje[k] || 0
            return (
              <Cip
                key={k}
                pritisnut={w < 0}
                onClick={() => akcije.postaviZelju(k, w < 0 ? 0 : -1)}
                className="aria-pressed:border-bad aria-pressed:bg-bad aria-pressed:text-background"
              >
                {t}
              </Cip>
            )
          })}
        </Cipovi>
        {Object.keys(zelje).length > 0 && (
          <Button
            variant="link"
            className="h-auto justify-self-start p-0"
            onClick={akcije.ponistiZelje}
          >
            Poništi želje
          </Button>
        )}
      </Polje>

      <Polje naslov="Spremljene pretrage" napomena="(samo u ovom pregledniku)" siroko>
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            akcije.spremiPretragu(naziv)
            setNaziv('')
          }}
        >
          <Input
            maxLength={40}
            placeholder="npr. Stan za nas"
            aria-label="Naziv pretrage"
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            className="h-10"
          />
          <Button type="submit" className="h-10">
            Spremi ovu pretragu
          </Button>
        </form>
      </Polje>

      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button variant="outline" className="h-10" onClick={akcije.ocisti}>
          Očisti sve filtere
        </Button>
        <Button variant="outline" className="h-10" onClick={() => void kopirajLink(location.href)}>
          Kopiraj link s filterima
        </Button>
      </div>
    </div>
  )
}
