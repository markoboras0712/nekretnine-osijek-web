'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useStored } from '@/hooks/use-stored'
import { naPonudu } from '@/lib/browser'
import { kalkPostavke } from '@/lib/calculator'
import { KLJUC, MAX_USPOREDBA, PO_STRANICI, POGLEDI, type Oznaka } from '@/lib/constants'
import type { Nek, Pripremljeno } from '@/lib/data'
import { rokUskoro, poRoku } from '@/lib/deadlines'
import {
  aktivniFilteri,
  brojeviCipova,
  prolazi,
  uPogledu,
  type Kontekst,
  type Stanje,
} from '@/lib/filters'
import {
  dekodOznaka,
  jeOznaka,
  planUvoza,
  postaviOznaku,
  uvezi,
  type Oznake,
  type PlanUvoza,
} from '@/lib/marks'
import { pretrazi, rastavi, type Prijedlog } from '@/lib/search'
import { obrniSmjer, usporedba, type SortKey, type SortKontekst } from '@/lib/sort'
import { citaj, pisi } from '@/lib/storage'
import {
  bezPogleda,
  citajSpremljenSort,
  izQuery,
  ocistiSve,
  postaviTrazi,
  primijeniOdabir,
  uQuery,
  vratiSort,
  type IzUrla,
} from '@/lib/url-state'
import { imaZelja, mojaOcjena, type MojaOcjena, type Zelje } from '@/lib/wishes'
import type { Nekretnina } from '@/types/podaci'

export type Pretraga = { naziv: string; q: string }
export type Uvoz = { tude: Oznake; plan: PlanUvoza }

function jeObjekt(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function procitajOznake(v: unknown): Oznake {
  if (!jeObjekt(v)) return {}
  return Object.fromEntries(Object.entries(v).filter(([, o]) => jeOznaka(o))) as Oznake
}

function procitajBrojeve(v: unknown): Record<string, number> {
  if (!jeObjekt(v)) return {}
  return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'number')) as Record<
    string,
    number
  >
}

function procitajPretrage(v: unknown): Pretraga[] {
  if (!Array.isArray(v)) return []
  return v.filter(
    (p): p is Pretraga => jeObjekt(p) && typeof p.naziv === 'string' && typeof p.q === 'string',
  )
}

function dekodiraj(s: string): string | null {
  try {
    return decodeURIComponent(s)
  } catch {
    return null
  }
}

/** `#n=<id>` (detail), `#usporedi=a,b` (comparison), `#oznake=f.1.2~x.3` (shared marks). */
function citajHash(h: string) {
  const n = h.match(/(?:^#|&)n=([^&]+)/)
  const u = h.match(/usporedi=([^&]+)/)
  const o = h.match(/oznake=([^&]+)/)
  return {
    detalj: n?.[1] ? dekodiraj(n[1]) : null,
    usporedi: u?.[1]
      ? (dekodiraj(u[1]) ?? '').split(',').filter(Boolean).slice(0, MAX_USPOREDBA)
      : null,
    oznake: o?.[1] ? dekodiraj(o[1]) : null,
  }
}

/** "Najrelevantnije" only with a query the search can use ("a" alone is ignored). */
function normaliziraj(n: IzUrla, viseRijeci: readonly string[]): IzUrla {
  return n.stanje.sort === 'relevantno' && !rastavi(n.stanje.trazi, viseRijeci).length
    ? vratiSort(n.stanje, n.sortPrijeTrazenja)
    : n
}

function makniHash() {
  history.replaceState(null, '', location.pathname + location.search)
}

/**
 * All state of the list page: filters (mirrored to the URL), personal data (mirrored to
 * localStorage, keys compatible with the old site) and hash routes. Render only in the browser.
 */
export function usePonuda(p: Pripremljeno) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ---------- personal data (localStorage) ----------
  // The hash the page opened with, e.g. a WhatsApp link to #n=<id>.
  const [pocetak] = useState(() => citajHash(location.hash))

  const [oznake, setOznake] = useStored<Oznake>(KLJUC.oznake, procitajOznake)
  const [vidjeno, setVidjeno] = useStored<Record<string, number>>(KLJUC.vidjeno, (v) => {
    let s = procitajBrojeve(v)
    if (!citaj(KLJUC.vidjenoInit, false)) {
      // First visit: do not show 800 "new" listings; new is what appears from today on.
      s = { ...s, ...Object.fromEntries(p.nekretnine.map((n) => [n.id, 1])) }
      pisi(KLJUC.vidjenoInit, true)
    }
    if (pocetak.detalj && p.poId.has(pocetak.detalj)) s = { ...s, [pocetak.detalj]: Date.now() }
    pisi(KLJUC.vidjeno, s)
    return s
  })
  const [zelje, setZelje] = useStored<Zelje>(KLJUC.zelje, procitajBrojeve)
  const [pretrage, setPretrage] = useStored<Pretraga[]>(KLJUC.pretrage, procitajPretrage)
  const [kalk, setKalk] = useStored(KLJUC.kalk, kalkPostavke)
  const [usporedbaIds, setUsporedba] = useStored<string[]>(KLJUC.usporedba, (v) => {
    const ids = pocetak.usporedi ?? (Array.isArray(v) ? v : [])
    return ids.filter((id): id is string => typeof id === 'string' && p.poId.has(id))
  })

  // ---------- filters (URL query) ----------
  const [url, setUrl] = useState<IzUrla>(() =>
    normaliziraj(
      izQuery(location.search, { spremljen: citajSpremljenSort(citaj(KLJUC.sort, null)) }),
      p.viseRijeci,
    ),
  )
  const { stanje } = url
  const [prikazano, setPrikazano] = useState(PO_STRANICI)

  useEffect(() => {
    const q = uQuery(stanje)
    const novi = location.pathname + (q ? '?' + q : '') + location.hash
    if (novi !== location.pathname + location.search + location.hash) {
      history.replaceState(null, '', novi)
    }
  }, [stanje])

  const jeUpit = useCallback((q: string) => rastavi(q, p.viseRijeci).length > 0, [p])

  const postavi = useCallback(
    (fn: (u: IzUrla) => IzUrla) => {
      setUrl((u) => normaliziraj(fn(u), p.viseRijeci))
      setPrikazano(PO_STRANICI)
    },
    [p],
  )

  const promijeni = useCallback(
    (fn: (s: Stanje) => Stanje) => postavi((u) => ({ ...u, stanje: fn(u.stanje) })),
    [postavi],
  )

  // ---------- hash routes ----------
  const [uvoz, setUvoz] = useState<Uvoz | null>(() => {
    if (pocetak.oznake == null) return null
    const tude = dekodOznaka(pocetak.oznake)
    return { tude, plan: planUvoza(tude, oznake, (id) => p.poId.has(id)) }
  })
  const [hash, setHash] = useState(() => {
    if (pocetak.oznake == null) return location.hash
    makniHash()
    return ''
  })

  const obradiHash = useCallback(
    (h: string) => {
      const r = citajHash(h)
      if (r.oznake != null) {
        const tude = dekodOznaka(r.oznake)
        setUvoz({ tude, plan: planUvoza(tude, oznake, (id) => p.poId.has(id)) })
        makniHash()
        setHash('')
        naPonudu()
        return
      }
      if (r.usporedi) {
        const ids = r.usporedi.filter((id) => p.poId.has(id))
        setUsporedba((u) => (u.join() === ids.join() ? u : ids))
      }
      if (r.detalj && p.poId.has(r.detalj)) {
        const id = r.detalj
        setVidjeno((v) => ({ ...v, [id]: Date.now() }))
      }
      setHash(h)
    },
    [oznake, p, setUsporedba, setVidjeno],
  )

  useEffect(() => {
    const f = () => obradiHash(location.hash)
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [obradiHash])

  const rute = useMemo(() => citajHash(hash), [hash])
  const detalj = rute.detalj ? (p.poId.get(rute.detalj) ?? null) : null
  const usporediOtvoreno = !!rute.usporedi && !rute.detalj

  const otvori = useCallback((id: string) => {
    location.hash = 'n=' + encodeURIComponent(id)
  }, [])
  const otvoriUsporedbu = useCallback((ids: string[]) => {
    location.hash = 'usporedi=' + ids.map(encodeURIComponent).join(',')
  }, [])
  const zatvori = useCallback(() => {
    if (location.hash) makniHash()
    setHash('')
  }, [])

  // ---------- derived ----------
  // Controls follow `stanje` at once; the list follows `ds`, which React may render a moment later
  // so typing stays responsive on slow phones.
  const ds = useDeferredValue(stanje)
  const upiti = useMemo(() => rastavi(ds.trazi, p.viseRijeci), [ds.trazi, p])
  const rezultat = useMemo(() => pretrazi(p.nekretnine, upiti), [p, upiti])

  const { sort, smjer } = ds

  const moja = useMemo(() => {
    const ocjene = new Map(
      p.nekretnine.map((n) => [n.id, mojaOcjena(n, zelje, p.znacajke, now)] as const),
    )
    return (n: Nekretnina): MojaOcjena => ocjene.get(n.id) ?? { ocjena: 0, zasto: [] }
  }, [p, zelje, now])

  const ctx: Kontekst = useMemo(() => ({ stanje: ds, rezultat, now }), [ds, rezultat, now])
  const sortCtx: SortKontekst = useMemo(() => ({ rezultat, moja, now }), [rezultat, moja, now])
  const moje = useMemo(() => ({ oznake, vidjeno }), [oznake, vidjeno])

  const osnovne = useMemo(() => p.nekretnine.filter((n) => prolazi(n, ctx)), [p, ctx])
  const brojPogleda = useMemo(
    () =>
      Object.fromEntries(
        POGLEDI.map(([k]) => [k, osnovne.filter((n) => uPogledu(n, k, moje, now)).length]),
      ) as Record<(typeof POGLEDI)[number][0], number>,
    [osnovne, moje, now],
  )
  const lista: Nek[] = useMemo(
    () =>
      osnovne
        .filter((n) => uPogledu(n, ds.pogled, moje, now))
        .sort(ds.pogled === 'rokovi' ? poRoku : usporedba(sort, smjer, sortCtx)),
    [osnovne, ds.pogled, moje, now, sort, smjer, sortCtx],
  )
  const cipovi = useMemo(() => brojeviCipova(p.nekretnine, ctx, moje), [p, ctx, moje])
  const aktivni = useMemo(() => aktivniFilteri(stanje, p.znacajke), [stanje, p])
  const rokoviUskoro = useMemo(
    () => osnovne.filter((n) => rokUskoro(n, now) && oznake[n.id] !== 'odbaceno'),
    [osnovne, now, oznake],
  )
  const upitBezPogleda = bezPogleda(uQuery(stanje))

  // ---------- actions ----------
  const akcije = useMemo(
    () => ({
      promijeni,
      postaviPogled(pogled: Stanje['pogled']) {
        promijeni((s) => ({ ...s, pogled }))
        naPonudu()
      },
      postaviTrazi(t: string) {
        postavi((u) => postaviTrazi(u.stanje, u.sortPrijeTrazenja, t, jeUpit))
      },
      odaberiPrijedlog(pr: Prijedlog, trazi: string) {
        postavi((u) => primijeniOdabir(u.stanje, u.sortPrijeTrazenja, pr, trazi))
      },
      postaviSort(s: SortKey) {
        postavi((u) => ({
          stanje: { ...u.stanje, sort: s, smjer: 0 },
          sortPrijeTrazenja: s === 'relevantno' ? u.sortPrijeTrazenja : null,
        }))
        if (s !== 'relevantno') pisi(KLJUC.sort, [s, 0])
        naPonudu()
      },
      obrniSmjer() {
        const novi = obrniSmjer(stanje.sort, stanje.smjer)
        promijeni((s) => ({ ...s, smjer: novi }))
        pisi(KLJUC.sort, [stanje.sort, novi])
      },
      ocisti() {
        setUrl((u) => ({
          stanje: ocistiSve(u.stanje, u.sortPrijeTrazenja),
          sortPrijeTrazenja: null,
        }))
        setPrikazano(PO_STRANICI)
      },
      prikaziJos() {
        setPrikazano((x) => x + PO_STRANICI)
      },
      oznaci(id: string, o: Oznaka) {
        setOznake((x) => postaviOznaku(x, id, o))
        setVidjeno((v) => ({ ...v, [id]: Date.now() }))
      },
      oznaciSveVidjeno(ids: string[]) {
        const t = Date.now()
        setVidjeno((v) => ({ ...v, ...Object.fromEntries(ids.map((id) => [id, t])) }))
      },
      prebaciUsporedbu(id: string) {
        setUsporedba((u) =>
          u.includes(id)
            ? u.filter((x) => x !== id)
            : // the oldest one leaves when the comparison is full
              [...u, id].slice(-MAX_USPOREDBA),
        )
      },
      ocistiUsporedbu() {
        setUsporedba([])
      },
      postaviZelju(k: string, w: number) {
        const { [k]: _staro, ...ostale } = zelje
        const nove: Zelje = w ? { ...ostale, [k]: w } : ostale
        setZelje(nove)
        if (imaZelja(nove) && stanje.sort !== 'moje' && stanje.sort !== 'relevantno') {
          promijeni((s) => ({ ...s, sort: 'moje', smjer: 0 }))
          pisi(KLJUC.sort, ['moje', 0])
        } else if (!Object.keys(nove).length && stanje.sort === 'moje') {
          promijeni((s) => ({ ...s, sort: 'ocjena', smjer: 0 }))
          pisi(KLJUC.sort, ['ocjena', 0])
        } else {
          setPrikazano(PO_STRANICI)
        }
      },
      ponistiZelje() {
        setZelje({})
        if (stanje.sort === 'moje') {
          promijeni((s) => ({ ...s, sort: 'ocjena', smjer: 0 }))
          pisi(KLJUC.sort, ['ocjena', 0])
        }
      },
      spremiPretragu(naziv: string) {
        const ime = naziv.trim() || `Pretraga ${pretrage.length + 1}`
        setPretrage([...pretrage.filter((x) => x.naziv !== ime), { naziv: ime, q: upitBezPogleda }])
        toast.success(`Spremljeno: ${ime}`)
      },
      primijeniPretragu(q: string) {
        history.replaceState(null, '', location.pathname + (q ? '?' + q : ''))
        setHash('')
        setUrl(
          normaliziraj(
            izQuery(q, {
              pogled: stanje.pogled,
              spremljen: citajSpremljenSort(citaj(KLJUC.sort, null)),
            }),
            p.viseRijeci,
          ),
        )
        setPrikazano(PO_STRANICI)
        naPonudu()
      },
      obrisiPretragu(naziv: string) {
        setPretrage(pretrage.filter((x) => x.naziv !== naziv))
      },
      prihvatiUvoz() {
        if (!uvoz) return
        const { tude, plan } = uvoz
        // Marks set while the banner was open win over the shared ones.
        const nove = plan.nove.filter((id) => !oznake[id])
        setOznake((o) => uvezi(o, tude, nove))
        const t = Date.now()
        setVidjeno((v) => ({
          ...v,
          ...Object.fromEntries(nove.map((id) => [id, v[id] || t])),
        }))
        setUvoz(null)
        toast.success(`Dodano ${nove.length} oznaka`)
        promijeni((s) => ({ ...s, pogled: 'favoriti' }))
        naPonudu()
      },
      odbijUvoz() {
        setUvoz(null)
      },
      postaviKalk: setKalk,
      otvori,
      otvoriUsporedbu,
      zatvori,
    }),
    [
      p,
      promijeni,
      postavi,
      jeUpit,
      oznake,
      stanje,
      zelje,
      pretrage,
      upitBezPogleda,
      uvoz,
      setOznake,
      setVidjeno,
      setUsporedba,
      setZelje,
      setPretrage,
      setKalk,
      otvori,
      otvoriUsporedbu,
      zatvori,
    ],
  )

  return {
    p,
    now,
    stanje,
    sort,
    smjer,
    upiti,
    rezultat,
    lista,
    prikazano,
    brojPogleda,
    cipovi,
    aktivni,
    rokoviUskoro,
    oznake,
    vidjeno,
    zelje,
    moja,
    sortCtx,
    pretrage,
    upitBezPogleda,
    kalk,
    usporedbaIds,
    uvoz,
    detalj,
    usporediOtvoreno,
    usporediIds: rute.usporedi ?? usporedbaIds,
    akcije,
  }
}

export type Ponuda = ReturnType<typeof usePonuda>
export type Akcije = Ponuda['akcije']
