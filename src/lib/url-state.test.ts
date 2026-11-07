import { describe, expect, it } from 'vitest'
import { prazno } from '@/lib/filters'
import {
  bezPogleda,
  citajSpremljenSort,
  izQuery,
  ocistiSve,
  postaviTrazi,
  primijeniOdabir,
  uQuery,
} from '@/lib/url-state'

describe('url state', () => {
  it('round-trips filters', () => {
    const st = {
      ...prazno(),
      pogled: 'favoriti' as const,
      mjesta: ['Retfala', 'Jug 2'],
      cmax: '150000',
      sort: 'cijena' as const,
      smjer: -1,
      prikaz: 'karta' as const,
    }
    const q = uQuery(st)
    expect(q).toBe('p=favoriti&m=Retfala%2CJug+2&cmax=150000&sort=cijena&smjer=dolje&prikaz=karta')
    expect(izQuery(q).stanje).toEqual(st)
  })

  it('writes nothing for defaults', () => {
    expect(uQuery(prazno())).toBe('')
  })

  it('reads legacy params and sorts', () => {
    const { stanje } = izQuery('bezag=1&dra=1&sort=cijena_down')
    expect(stanje.brzo).toEqual(['bezag', 'dra'])
    expect([stanje.sort, stanje.smjer]).toEqual(['cijena', -1])
    expect(izQuery('sort=najdulje').stanje.smjer).toBe(1)
  })

  it('maps a legacy stored sort string', () => {
    expect(citajSpremljenSort('cijena_up')).toEqual(['cijena', 1])
    expect(citajSpremljenSort('novo')).toEqual(['datum', -1])
    expect(citajSpremljenSort('m2')).toEqual(['m2', 0])
    expect(citajSpremljenSort('constructor')).toEqual(['ocjena', 0])
  })

  it('ignores sort names that are object properties', () => {
    expect(izQuery('sort=constructor').stanje.sort).toBe('ocjena')
    expect(izQuery('sort=toString').stanje.sort).toBe('ocjena')
  })

  it('uses the stored sort when the URL has none', () => {
    expect(izQuery('', { spremljen: ['m2', -1] }).stanje).toMatchObject({ sort: 'm2', smjer: -1 })
    expect(izQuery('sort=datum', { spremljen: ['m2', -1] }).stanje).toMatchObject({
      sort: 'datum',
      smjer: 0,
    })
  })

  it('sorts by relevance while searching and restores afterwards', () => {
    const { stanje, sortPrijeTrazenja } = izQuery('trazi=lift&smjer=gore', {
      spremljen: ['cijena', 0],
    })
    expect(stanje.sort).toBe('relevantno')
    expect(sortPrijeTrazenja).toEqual(['cijena', 1])
    const r = postaviTrazi(stanje, sortPrijeTrazenja, '')
    expect(r.stanje).toMatchObject({ trazi: '', sort: 'cijena', smjer: 1 })
  })

  it('switches to relevance on the first keystroke only', () => {
    const a = postaviTrazi({ ...prazno(), sort: 'm2' }, null, 'l')
    expect(a.stanje.sort).toBe('relevantno')
    const b = postaviTrazi({ ...a.stanje, sort: 'cijena' }, a.sortPrijeTrazenja, 'li')
    expect(b.stanje.sort).toBe('cijena')
  })

  it('keeps the view and sort when clearing', () => {
    const st = {
      ...prazno(),
      pogled: 'novo' as const,
      trazi: 'x',
      sort: 'relevantno' as const,
      mjesta: ['A'],
    }
    expect(ocistiSve(st, ['m2', 1])).toEqual({ ...prazno(), pogled: 'novo', sort: 'm2', smjer: 1 })
  })

  it('drops the view from saved searches', () => {
    expect(bezPogleda('p=novo&m=A')).toBe('m=A')
  })

  it('ignores unknown views', () => {
    expect(izQuery('p=hack').stanje.pogled).toBe('sve')
  })
})

describe('choosing a suggestion', () => {
  it('turns a place into a filter and restores the sort when no text is left', () => {
    const st = { ...prazno(), trazi: 'retf', sort: 'relevantno' as const }
    const r = primijeniOdabir(st, ['cijena', 0], { tip: 'mjesto', v: 'Retfala' }, '')
    expect(r.stanje).toMatchObject({ trazi: '', mjesta: ['Retfala'], sort: 'cijena' })
  })

  it('keeps searching by relevance when text is left', () => {
    const r = primijeniOdabir({ ...prazno(), sort: 'm2' }, null, { tip: 'tekst', v: 'X' }, '"X"')
    expect(r.stanje.sort).toBe('relevantno')
    expect(r.sortPrijeTrazenja).toEqual(['m2', 0])
  })
})
