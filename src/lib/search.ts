/**
 * Free-text search: diacritics-insensitive, every word must match, `-word` excludes, `"phrase"`,
 * prefix/stem matching and synonyms. Ported from the old app.js.
 */

/** Searchable, normalised text of one listing (see data.ts). */
export type Indeks = {
  /** title + place + type + rooms (a hit here weighs 3) */
  _tn: string
  /** description alone (snippets, highlighting) */
  _no: string
  /** description + agency, seller, features, floor, sources (a hit here weighs 1) */
  _to: string
}

export type Upit = { tekst: string; ne: boolean; re: RegExp }

/** Same concept, different words: a query for one finds any of them. */
const SINONIMI: string[][] = [
  ['lift', 'dizalo'],
  ['okucnica', 'dvoriste', 'vrt'],
  ['novogradnja', 'nova gradnja', 'novoizgraden', 'u izgradnji'],
  ['garaza', 'garazno'],
  ['balkon', 'terasa', 'lodja', 'loggia'],
  ['parking', 'parkirno'],
  ['centar', 'centru'],
  ['jug 2', 'jug ii'],
  ['jug ii', 'jug 2'],
  ['kuca', 'obiteljska kuca', 'katnica', 'prizemnica'],
  ['zemljiste', 'parcela', 'plac'],
  ['namjesten', 'namjesteno', 'namjestaj'],
  ['renoviran', 'adaptiran', 'obnovljen', 'preureden'],
  ['podrum', 'spremiste'],
  ['klima', 'klimatiziran'],
  ['poslovni', 'poslovni prostor', 'lokal', 'ured'],
  ['jednosob', '1 soba', 'garsonijer'],
  ['dvosob', '2 sobe', '2-sob'],
  ['trosob', '3 sobe', '3-sob'],
  ['cetverosob', 'cetvorosob', '4 sobe', '4-sob'],
]

/** Phrases always searched as one, besides multi-word place names. */
export const STALNE_FRAZE = ['jug ii', 'nova gradnja', 'obiteljska kuca', 'poslovni prostor']

/**
 * Lower case without diacritics (đ -> d). Every character stays at the same index, so a match
 * in the normalised text marks the same span in the original.
 */
export function norm(s: string | null | undefined): string {
  const t = (s || '').toLowerCase()
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7f]/.test(t)
    ? // eslint-disable-next-line no-control-regex
      t.replace(/[^\x00-\x7f]/g, (c) => (c === 'đ' ? 'd' : c.normalize('NFD').charAt(0)))
    : t
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Words match by their start and drop a final vowel (case ending): "garaze" finds garaža. */
export function korijen(r: string): string {
  return r.length >= 4 && /[aeiou]$/.test(r) ? r.slice(0, -1) : r
}

function uzorak(rijec: string, fraza: boolean): string {
  const dijelovi = rijec.split(/\s+/).filter(Boolean)
  const tijelo = dijelovi
    .map((d, i) => esc(i === dijelovi.length - 1 && !fraza ? korijen(d) : d))
    .join('\\s+')
  return '(^|[^a-z0-9])' + tijelo + (/\d$/.test(rijec) ? '(?![0-9])' : '')
}

function inacice(r: string, fraza: boolean): RegExp {
  const v = [r]
  if (r.includes('dj')) v.push(r.replace(/dj/g, 'd'))
  const k = korijen(r)
  for (const g of SINONIMI) {
    const pogodak = g.some(
      (w) =>
        w === r ||
        (!fraza && r.length >= 4 && (korijen(w) === k || (w.length >= 5 && r.startsWith(w)))),
    )
    if (pogodak) for (const w of g) if (!v.includes(w)) v.push(w)
  }
  return new RegExp(v.map((x) => uzorak(x, fraza || x.indexOf(' ') > 0)).join('|'))
}

/**
 * Splits a query into terms. Multi-word place names in `viseRijeci` (normalised, longest first)
 * are quoted automatically so "jug 2" is one phrase.
 */
export function rastavi(upit: string, viseRijeci: readonly string[] = []): Upit[] {
  let q = norm(upit).trim()
  for (const f of viseRijeci) {
    const i = q.indexOf(f)
    if (i >= 0 && q.charAt(i - 1) !== '"') q = q.slice(0, i) + '"' + f + '"' + q.slice(i + f.length)
  }
  const upiti: Upit[] = []
  const re = /(-?)"([^"]+)"|(-?)(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(q))) {
    const tekst = (m[2] || m[4] || '').trim()
    const ne = !!(m[1] || m[3])
    if (!tekst || (!m[2] && tekst.length < 2 && !/\d/.test(tekst))) continue
    upiti.push({ tekst, ne, re: inacice(tekst, !!m[2]) })
  }
  return upiti
}

/** 0 = no match; title/place hit 3, other text 1; only exclusions matched = 0.5. */
export function relevantnost(n: Indeks, upiti: readonly Upit[]): number {
  let b = 0
  for (const u of upiti) {
    const uNaslovu = u.re.test(n._tn)
    const uOstalom = !uNaslovu && u.re.test(n._to)
    if (u.ne) {
      if (uNaslovu || uOstalom) return 0
      continue
    }
    if (!uNaslovu && !uOstalom) return 0
    b += uNaslovu ? 3 : 1
  }
  return b || 0.5
}

/** id -> relevance for matching listings, or null when there is no query. */
export function pretrazi(
  lista: readonly (Indeks & { id: string })[],
  upiti: readonly Upit[],
): Map<string, number> | null {
  if (!upiti.length) return null
  const r = new Map<string, number>()
  for (const n of lista) {
    const v = relevantnost(n, upiti)
    if (v) r.set(n.id, v)
  }
  return r
}

export type Dio = { tekst: string; mark: boolean }

/** Text between `od` and `do_` split into plain and highlighted parts (never parsed as HTML). */
export function istakni(
  izvorni: string,
  normaliziran: string,
  upiti: readonly Upit[],
  od = 0,
  do_ = izvorni.length,
): Dio[] {
  const raspon: [number, number][] = []
  const dio = normaliziran.slice(od, do_)
  for (const u of upiti) {
    if (u.ne) continue
    const g = new RegExp(u.re.source, 'g')
    let m: RegExpExecArray | null
    while ((m = g.exec(dio))) {
      const p = m.index + (/^[^a-z0-9]/.test(m[0]) ? 1 : 0)
      raspon.push([od + p, od + m.index + m[0].length])
      if (m[0].length === 0) g.lastIndex++
    }
  }
  raspon.sort((a, b) => a[0] - b[0])
  const van: Dio[] = []
  let poz = od
  for (const [a, b] of raspon) {
    if (a < poz) continue
    if (a > poz) van.push({ tekst: izvorni.slice(poz, a), mark: false })
    van.push({ tekst: izvorni.slice(a, b), mark: true })
    poz = b
  }
  if (poz < do_) van.push({ tekst: izvorni.slice(poz, do_), mark: false })
  return van
}

/** ~160 characters of the description around the first hit, or null. */
export function isjecak(
  opis: string,
  no: string,
  upiti: readonly Upit[],
): { pocetak: boolean; dijelovi: Dio[]; kraj: boolean } | null {
  if (!opis) return null
  let prvi = -1
  for (const u of upiti) {
    if (u.ne) continue
    const m = u.re.exec(no)
    if (m) {
      const p = m.index + (/^[^a-z0-9]/.test(m[0]) ? 1 : 0)
      if (prvi < 0 || p < prvi) prvi = p
    }
  }
  if (prvi < 0) return null
  let od = Math.max(0, prvi - 50)
  const do_ = Math.min(opis.length, prvi + 110)
  if (od > 0) {
    const r = opis.indexOf(' ', od)
    if (r > 0 && r < prvi) od = r + 1
  }
  return {
    pocetak: od > 0,
    dijelovi: istakni(opis, no, upiti, od, do_),
    kraj: do_ < opis.length,
  }
}

// ---------- suggestions while typing ----------

export type TipPrijedloga = 'mjesto' | 'opcina' | 'zn' | 'vrsta' | 'sobe' | 'tekst'

export type Kandidat = {
  tip: TipPrijedloga
  v: string
  tekst: string
  opis: string
  broj?: number
  /** normalised tekst */
  n: string
}

export type Prijedlog = Kandidat & {
  /** how many trailing query words (beyond the last) the suggestion replaces */
  rijeci: number
}

/** Endings of the query (last 1-3 words): "kuca donji gr" -> ["gr", "donji gr", "kuca donji gr"]. */
export function zavrseci(q: string): string[] {
  if (/\s$/.test(q)) return []
  const w = norm(q).trim().split(/\s+/).filter(Boolean)
  const van: string[] = []
  for (let k = w.length - 1; k >= Math.max(0, w.length - 3); k--) van.push(w.slice(k).join(' '))
  return van.filter((t) => t.length >= 2)
}

function pogodak(kn: string, zav: string[]) {
  for (let i = zav.length - 1; i >= 0; i--) {
    const z = zav[i] as string
    if (kn.startsWith(z)) return { duljina: z.length, pocetak: 1, k: i }
    if (kn.indexOf(' ' + z) > 0) return { duljina: z.length, pocetak: 0, k: i }
  }
  return null
}

/** Up to 8 suggestions for the current input; `vec` holds values already applied as filters. */
export function predlozi(
  unos: string,
  kandidati: readonly Kandidat[],
  vec: Partial<Record<TipPrijedloga, readonly string[]>>,
): Prijedlog[] {
  const zav = zavrseci(unos)
  if (!zav.length) return []
  return kandidati
    .flatMap((k) => {
      if (vec[k.tip]?.includes(k.v)) return []
      const p = pogodak(k.n, zav)
      return p ? [{ k, p }] : []
    })
    .sort(
      (a, b) =>
        b.p.duljina - a.p.duljina || b.p.pocetak - a.p.pocetak || (b.k.broj || 0) - (a.k.broj || 0),
    )
    .slice(0, 8)
    .map(({ k, p }) => ({ ...k, rijeci: p.k }))
}

/** The query left after choosing a suggestion: its matched words are removed (or quoted for 'tekst'). */
export function upitNakonOdabira(unos: string, p: Prijedlog): string {
  const w = unos.trim().split(/\s+/)
  const bez = w.slice(0, Math.max(0, w.length - 1 - p.rijeci)).join(' ')
  return p.tip === 'tekst' ? `${bez} "${p.v}"`.trim() : bez
}
