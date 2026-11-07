'use client'

import { useState, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { izracun, jeAgencija, jeNovogradnja, povrat, type Kalk } from '@/lib/calculator'
import { eur, jeUdio, zarez } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Nekretnina } from '@/types/podaci'

type BrojKalk = Exclude<keyof Kalk, 'prva'>

function PoljeKalk({
  natpis,
  jedinica,
  korak,
  vrijednost,
  onChange,
}: {
  natpis: string
  jedinica: string
  korak: number
  vrijednost: number
  onChange: (v: number) => void
}) {
  // Keep what is typed ("3," on the way to "3,5") and store only valid numbers.
  const [tekst, setTekst] = useState(String(vrijednost))
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{natpis}</span>
      <span className="flex items-center gap-1.5">
        <Input
          type="text"
          inputMode="decimal"
          step={korak}
          value={tekst}
          onChange={(e) => {
            setTekst(e.target.value)
            const v = parseFloat(e.target.value.replace(',', '.'))
            if (Number.isFinite(v) && v >= 0) onChange(v)
          }}
          className="h-9 w-24"
        />
        <small className="text-muted-foreground">{jedinica}</small>
      </span>
    </label>
  )
}

function Red({
  natpis,
  iznos,
  ton,
}: {
  natpis: string
  iznos: string
  ton?: 'zbroj' | 'glavno' | 'dobro'
}) {
  return (
    <div
      className={cn(
        'flex justify-between gap-3 py-1 text-sm',
        ton === 'zbroj' && 'border-t pt-2 font-semibold',
        ton === 'glavno' && 'font-semibold text-base',
        ton === 'dobro' && 'text-good',
      )}
    >
      <span>{natpis}</span>
      <b className="tabular-nums whitespace-nowrap">{iznos}</b>
    </div>
  )
}

function Napomena({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

/** Purchase costs and mortgage; settings are shared across listings and kept per browser. */
export function Kalkulator({
  n,
  kalk,
  postaviKalk,
}: {
  n: Nekretnina
  kalk: Kalk
  postaviKalk: (k: Kalk) => void
}) {
  const [novogradnja, setNovogradnja] = useState(() => jeNovogradnja(n))
  const agencija = jeAgencija(n)
  const x = izracun(n, kalk, novogradnja)
  const polje = (k: BrojKalk, natpis: string, korak: number, jedinica: string) => (
    <PoljeKalk
      natpis={natpis}
      jedinica={jedinica}
      korak={korak}
      vrijednost={kalk[k]}
      onChange={(v) => postaviKalk({ ...kalk, [k]: v })}
    />
  )

  return (
    <details className="group rounded-xl border bg-muted/40">
      <summary className="cursor-pointer list-inside p-3 font-semibold">
        {x
          ? `Troškovi kupnje i kredit: ≈ ${eur(x.gotovina)} odmah` +
            (x.kredit ? `, rata ≈ ${eur(x.rata)}/mj.` : '')
          : 'Troškovi kupnje i kredit'}
      </summary>
      <div className="grid gap-4 border-t p-3">
        <div className="flex flex-wrap gap-3">
          {polje('ucesce', 'Učešće', 5, '%')}
          {polje('kamata', 'Kamata', 0.1, '%')}
          {polje('godina', 'Rok', 1, 'god.')}
          {agencija && polje('provizija', 'Provizija agencije', 0.5, '% + PDV')}
          {polje('biljeznik', 'Bilježnik, odvjetnik, upis', 50, '€')}
        </div>
        <div className="grid gap-2">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={novogradnja}
              onCheckedChange={(v) => setNovogradnja(v === true)}
              className="mt-0.5"
            />
            <span>Novogradnja od investitora (PDV je u cijeni, nema poreza na promet)</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={kalk.prva}
              onCheckedChange={(v) => postaviKalk({ ...kalk, prva: v === true })}
              className="mt-0.5"
            />
            <span>Prva nekretnina i mlađi od 45 godina (mogući povrat poreza)</span>
          </label>
        </div>
        {!x ? (
          <p className="text-sm">Cijena nije poznata, pa se troškovi ne mogu izračunati.</p>
        ) : (
          <div>
            <Red natpis="Cijena" iznos={eur(x.c)} />
            <Red
              natpis={
                novogradnja
                  ? 'Porez na promet (ne plaća se, PDV je u cijeni)'
                  : 'Porez na promet nekretnina 3 %'
              }
              iznos={eur(x.porez)}
            />
            <Red
              natpis={
                agencija
                  ? `Provizija agencije ${zarez(kalk.provizija)} % + PDV`
                  : 'Provizija agencije'
              }
              iznos={agencija ? eur(x.provizija) : 'nema'}
            />
            <Red natpis="Bilježnik, odvjetnik i upis (procjena)" iznos={eur(kalk.biljeznik)} />
            <Red natpis="Troškovi kupnje ukupno" iznos={eur(x.troskovi)} ton="zbroj" />
            <Red natpis={`Učešće ${zarez(kalk.ucesce)} %`} iznos={eur(x.ucesce)} />
            <Red natpis="Potrebno gotovine odmah" iznos={eur(x.gotovina)} ton="glavno" />
            {x.kredit > 0 && (
              <>
                <Red natpis="Kredit" iznos={eur(x.kredit)} />
                <Red
                  natpis={`Mjesečna rata (${kalk.godina} god., ${zarez(kalk.kamata)} %)`}
                  iznos={eur(x.rata)}
                  ton="glavno"
                />
                <Red natpis="Ukupno kamata kroz cijeli rok" iznos={eur(x.kamate)} />
              </>
            )}
            {kalk.prva && (
              <>
                <Red
                  natpis={
                    novogradnja
                      ? 'Mogući povrat 50 % PDV-a (naknadno)'
                      : 'Mogući povrat 50 % poreza (naknadno)'
                  }
                  iznos={'− ' + eur(povrat(x, novogradnja))}
                  ton="dobro"
                />
                <Napomena>
                  Povrat za prvu stambenu nekretninu (mlađi od 45) vrijedi samo ako površina i
                  cijena po m² ne prelaze propisane granice i ako se nekretnina 5 godina ne proda ni
                  ne iznajmi. Zahtjev ide preko APN-a.
                </Napomena>
              </>
            )}
          </div>
        )}
        {x && n.nacin !== 'oglas' && (
          <Napomena>
            Kod dražbe i natječaja: jamčevina{n.jamcevina ? ` (${eur(n.jamcevina)})` : ''} uplaćuje
            se unaprijed, a kupovnina u kratkom roku nakon dražbe, pa kredit treba dogovoriti prije.
          </Napomena>
        )}
        {x && jeUdio(n) && (
          <Napomena>
            Ovo je suvlasnički udio: banke ga rijetko prihvaćaju kao zalog za kredit.
          </Napomena>
        )}
        {x && (
          <Napomena>
            Orijentacijski izračun, nije financijski savjet. Porez na promet je 3 % tržišne
            vrijednosti (Porezna uprava). Provizija ide po cjeniku agencije i duguje se samo uz
            potpisan ugovor o posredovanju (zakon od 7. 7. 2026.). Banke traže najmanje 20 % učešća,
            a kamate su u 2026. oko 2,5–3,5 %. Točne uvjete provjeri u banci.
          </Napomena>
        )}
      </div>
    </details>
  )
}
