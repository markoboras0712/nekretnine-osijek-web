import type { Nekretnina } from '@/types/podaci'

/** A complete listing with neutral values; override what a test cares about. */
export function nek(o: Partial<Nekretnina> = {}): Nekretnina {
  return {
    id: '1',
    vrsta: 'stan',
    opcina: 'Osijek',
    naselje: 'Osijek',
    kvart: 'Centar',
    sobe: 2,
    kat: 1,
    zadnji_kat: false,
    znacajke: [],
    cijena: 100000,
    povrsina: 50,
    zemljiste: null,
    eur_m2: 2000,
    vs_prosjek: 0,
    ocjena: 50,
    prolazi: true,
    razlozi: '',
    naslov: 'Stan',
    opis: '',
    telefon: '',
    slika: '',
    url: 'https://example.com/1',
    izvori: [{ naziv: 'Njuškalo', url: 'https://example.com/1', cijena: 100000, aktivan: true }],
    od: '2026-11-01 10:00',
    nacin: 'oglas',
    rok: '',
    jamcevina: null,
    prodavac: '',
    agencija: '',
    zemljiste_vrsta: '',
    predmet: 'cijela',
    aktivan: true,
    cijene: [],
    pad: null,
    ...o,
  }
}

/** 2026-11-07 14:00 local (TZ is pinned to Europe/Zagreb in vitest.config.ts). */
export const SADA = new Date('2026-11-07T14:00').getTime()
