'use client'

import { SearchIcon } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import type { Ponuda } from '@/hooks/use-ponuda'
import { naPonudu } from '@/lib/browser'
import { predlozi, upitNakonOdabira, type Prijedlog } from '@/lib/search'

/**
 * Always-visible search with suggestions (ARIA combobox). Choosing a place, feature, rooms or
 * type applies a filter; an agency goes into the query as a phrase.
 */
export function Trazilica({ x }: { x: Ponuda }) {
  const { stanje, p, akcije } = x
  const [unos, setUnos] = useState(stanje.trazi)
  // Follow outside changes of the query (a removed chip, a saved search).
  const [zadnji, setZadnji] = useState(stanje.trazi)
  if (zadnji !== stanje.trazi) {
    setZadnji(stanje.trazi)
    if (unos.trim() !== stanje.trazi) setUnos(stanje.trazi)
  }
  const [otvoreno, setOtvoreno] = useState(false)
  const [aktivni, setAktivni] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()

  const prijedlozi = useMemo(
    () =>
      otvoreno
        ? predlozi(unos, p.kandidati, {
            mjesto: stanje.mjesta,
            opcina: stanje.opcine,
            zn: stanje.zn,
            sobe: stanje.sobe,
          })
        : [],
    [otvoreno, unos, p.kandidati, stanje.mjesta, stanje.opcine, stanje.zn, stanje.sobe],
  )
  const pokazi = prijedlozi.length > 0

  function odaberi(pr: Prijedlog) {
    const trazi = upitNakonOdabira(unos, pr)
    setUnos(trazi)
    setZadnji(trazi)
    setOtvoreno(false)
    setAktivni(-1)
    akcije.odaberiPrijedlog(pr, trazi)
  }

  return (
    <div role="search" className="relative min-w-0 flex-1">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={input}
        type="search"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Traži: Retfala, garaža, trosoban, novogradnja…"
        aria-label="Traži nekretnine"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={pokazi}
        aria-controls={`${id}-lista`}
        aria-activedescendant={aktivni >= 0 && pokazi ? `${id}-${aktivni}` : undefined}
        value={unos}
        onChange={(e) => {
          setUnos(e.target.value)
          setOtvoreno(true)
          setAktivni(-1)
          akcije.postaviTrazi(e.target.value)
        }}
        onFocus={() => setOtvoreno(true)}
        onBlur={() => setTimeout(() => setOtvoreno(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!pokazi) return
            e.preventDefault()
            const n = prijedlozi.length + 1
            const sljedeci = (aktivni + (e.key === 'ArrowDown' ? 1 : -1) + 1 + n) % n
            setAktivni(sljedeci - 1)
          } else if (e.key === 'Enter') {
            const pr = aktivni >= 0 ? prijedlozi[aktivni] : undefined
            if (pr) {
              e.preventDefault()
              odaberi(pr)
            } else {
              setOtvoreno(false)
              input.current?.blur()
              naPonudu()
            }
          } else if (e.key === 'Escape') {
            setOtvoreno(false)
          }
        }}
        className="h-11 w-full rounded-full border bg-card pr-4 pl-10 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:cursor-pointer"
      />
      <ul
        id={`${id}-lista`}
        role="listbox"
        aria-label="Prijedlozi"
        hidden={!pokazi}
        className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-auto rounded-xl border bg-popover p-1 shadow-lg"
      >
        {prijedlozi.map((pr, i) => (
          <li
            key={`${pr.tip}:${pr.v}`}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === aktivni}
            // mousedown, not click: the input's blur would close the list first
            onMouseDown={(e) => {
              e.preventDefault()
              odaberi(pr)
            }}
            className="flex cursor-pointer items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted hover:bg-muted"
          >
            <span>{pr.tekst}</span>
            <small className="text-xs text-muted-foreground">
              {pr.opis}
              {pr.broj ? ` · ${pr.broj}` : ''}
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}
