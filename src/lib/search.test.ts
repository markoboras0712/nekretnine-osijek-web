import { describe, expect, it } from 'vitest'
import {
  isjecak,
  istakni,
  norm,
  predlozi,
  rastavi,
  relevantnost,
  upitNakonOdabira,
  type Indeks,
  type Kandidat,
} from '@/lib/search'

function idx(naslov: string, opis = ''): Indeks {
  return { _tn: norm(naslov), _no: norm(opis), _to: norm(opis) }
}

function nadje(q: string, n: Indeks, vise: string[] = []) {
  return relevantnost(n, rastavi(q, vise)) > 0
}

describe('norm', () => {
  it('drops diacritics and keeps positions', () => {
    expect(norm('Đakovo Čepin Garaža')).toBe('dakovo cepin garaza')
    expect(norm('Garaža').length).toBe('Garaža'.length)
  })
})

describe('search', () => {
  const garaza = idx('Kuća s garažom', 'Lijepa kuća, okućnica 500 m²')

  it('needs every word, ignores case and diacritics', () => {
    expect(nadje('kuca garaz', garaza)).toBe(true)
    expect(nadje('kuca lift', garaza)).toBe(false)
  })

  it('matches by stem: "garaze" finds garaža', () => {
    expect(nadje('garaze', idx('Stan s garažom'))).toBe(true)
  })

  it('excludes -words', () => {
    expect(nadje('kuca -garaza', garaza)).toBe(false)
    expect(nadje('-lift', garaza)).toBe(true)
  })

  it('knows synonyms', () => {
    expect(nadje('dizalo', idx('Stan, lift'))).toBe(true)
    expect(nadje('dvoriste', garaza)).toBe(true)
    expect(nadje('novogradnja', idx('Stan', 'nova gradnja 2025'))).toBe(true)
    expect(nadje('trosoban', idx('Stan', '3 sobe, balkon'))).toBe(true)
    expect(nadje('jug 2', idx('Stan Jug II'), ['jug 2'])).toBe(true)
  })

  it('searches quoted phrases as a whole', () => {
    expect(nadje('"donji grad"', idx('Stan, Donji grad'))).toBe(true)
    expect(nadje('"donji grad"', idx('Stan', 'grad donji'))).toBe(false)
  })

  it('auto-quotes multi-word places', () => {
    const u = rastavi('stan donji grad', ['donji grad'])
    expect(u.map((x) => x.tekst)).toEqual(['stan', 'donji grad'])
  })

  it('does not let a number match a longer number', () => {
    expect(nadje('jug 2', idx('Stan Jug 21'), ['jug 2'])).toBe(false)
  })

  it('weighs title hits above description hits', () => {
    const u = rastavi('balkon')
    expect(relevantnost(idx('Stan s balkonom'), u)).toBe(3)
    expect(relevantnost(idx('Stan', 'ima balkon'), u)).toBe(1)
  })

  it('highlights matches without changing the text', () => {
    const t = 'Kuća s garažom'
    const d = istakni(t, norm(t), rastavi('garaza'))
    expect(d.map((x) => x.tekst).join('')).toBe(t)
    expect(d.filter((x) => x.mark).map((x) => x.tekst)).toEqual(['garaž'])
  })

  it('cuts a snippet around the first hit', () => {
    const opis = 'a '.repeat(100) + 'ima lijepi balkon i vrt ' + 'b '.repeat(100)
    const s = isjecak(opis, norm(opis), rastavi('balkon'))
    expect(s?.pocetak).toBe(true)
    expect(s?.kraj).toBe(true)
    expect(s?.dijelovi.some((d) => d.mark && d.tekst === 'balkon')).toBe(true)
  })
})

describe('suggestions', () => {
  const k = (tip: Kandidat['tip'], tekst: string, broj?: number): Kandidat => ({
    tip,
    v: tekst,
    tekst,
    opis: '',
    broj,
    n: norm(tekst),
  })
  const sve = [k('mjesto', 'Donji grad', 30), k('mjesto', 'Gornji grad', 40), k('zn', 'Garaža')]

  it('matches the last words of the input', () => {
    expect(predlozi('kuca donji gr', sve, {}).map((p) => p.tekst)).toEqual([
      'Donji grad',
      'Gornji grad',
    ])
    expect(predlozi('gar', sve, {}).map((p) => p.tekst)).toEqual(['Garaža'])
    expect(predlozi('gar ', sve, {})).toEqual([])
  })

  it('hides values already used as filters', () => {
    expect(predlozi('gar', sve, { zn: ['Garaža'] })).toEqual([])
  })

  it('removes the words a suggestion replaces', () => {
    const [p] = predlozi('kuca donji gr', sve, {})
    expect(upitNakonOdabira('kuca donji gr', p!)).toBe('kuca')
    const ag = predlozi('nekr', [k('tekst', 'Nekretnine Plus')], {})[0]!
    expect(upitNakonOdabira('stan nekr', ag)).toBe('stan "Nekretnine Plus"')
  })
})
