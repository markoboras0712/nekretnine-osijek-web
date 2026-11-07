import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Hero } from '@/components/Hero'
import { Brojke, Osvjezeno, SkupineIzvora } from '@/components/OAlatuPodaci'
import { ThemeSwitch } from '@/components/ThemeSwitch'

export const metadata: Metadata = {
  title: 'Kako radi',
  description:
    'Kako alat skuplja oglase za nekretnine u Osijeku i okolici, odakle su podaci i koliko su svježi.',
}

const KORACI: [string, string][] = [
  [
    'Skupljanje',
    'Alat se pokreće svakih 15 minuta i provjerava izvore kojima je došlo vrijeme: e-mail obavijesti portala svakih 15 minuta, Realiticu svaki sat, agencije svaka 2 sata, natječaje i dražbe dvaput dnevno. Iz PDF-ova natječaja nekretnine izdvaja AI.',
  ],
  [
    'Čišćenje',
    'Iz svakog oglasa čitaju se cijena, površina, okućnica (i u čhv ili hektarima), mjesto i vrsta. Oglasi izvan Osijeka i okolice, najmovi i suvlasnički udjeli se odvajaju.',
  ],
  [
    'Spajanje duplikata',
    'Ista nekretnina na Njuškalu, Indexu i stranici agencije prepoznaje se po cijeni, površini, naslovu i telefonu, pa postaje jedna kartica sa svim linkovima.',
  ],
  [
    'Ocjena',
    'Cijena po m² uspoređuje se s prosjekom tog mjesta, izračunatim iz svih aktivnih oglasa. Što je ponuda povoljnija od prosjeka, to je ocjena viša.',
  ],
  [
    'Objava',
    'Svakih sat vremena ova stranica dobiva svježe podatke. Kad neki oglas nestane sa svih izvora, prelazi u "Nestali".',
  ],
]

const PITANJA: [string, string][] = [
  [
    'Što znači "18 % ispod prosjeka"?',
    'Cijena po m² te nekretnine je 18 % niža od srednje (medijan) cijene po m² za istu vrstu nekretnine u tom mjestu. Prosjek se računa samo kad u mjestu ima barem šest usporedivih oglasa; inače se uspoređuje s cijelom općinom. Velika razlika (više od 65 %) gotovo je uvijek greška u oglasu, pa se tako i označava.',
  ],
  [
    'Tko vidi moje favorite i odbačene?',
    'Nitko. Oznake se spremaju samo u tvom pregledniku, na tvom uređaju. Nema prijave ni računa.',
  ],
  [
    'Što je "Novo za mene"?',
    'Nekretnine koje se pojave nakon tvog prvog posjeta, a još ih nisi otvorio. Kad otvoriš karticu, više nije nova.',
  ],
  [
    'Ima li Facebook grupa i Marketplacea?',
    'Još ne. Facebook ne dopušta automatsko čitanje grupa; dodat će se preko Facebookovih e-mail obavijesti.',
  ],
  [
    'Jesu li podaci točni?',
    'Podaci su prepisani iz javnih oglasa i automatski obrađeni, pa mogu sadržavati greške. Prije bilo kakve odluke otvori izvorni oglas; kod natječaja i dražbi uvjete, rokove i jamčevinu uvijek provjeri u službenom dokumentu.',
  ],
  ['Koliko košta?', 'Ništa. Stranica je besplatna i bez oglasa.'],
]

function Odjeljak({ id, naslov, children }: { id: string; naslov: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-2.5">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {naslov}
      </h2>
      {children}
    </section>
  )
}

export default function OAlatu() {
  return (
    <>
      <Hero labelledBy="naslov" mali>
        <Link href="/" className="text-sm text-[#cfe7dd] hover:underline">
          ← Natrag na ponudu
        </Link>
        <h1
          id="naslov"
          className="text-[clamp(1.5rem,4.6vw,2.4rem)] leading-tight font-bold tracking-tight"
        >
          Kako radi
        </h1>
        <p className="m-0 max-w-[40em] text-[clamp(0.95rem,2.4vw,1.08rem)] text-[#d3e6de]">
          Umjesto da svaki dan otvaraš deset portala, agencija i stranica s natječajima, alat to
          radi sam, svakih 15 minuta, i sve slaže na jedno mjesto. Ista kuća na tri portala ovdje je
          jedna kartica.
        </p>
      </Hero>

      <main className="mx-auto grid max-w-[860px] gap-9 px-4 pt-6 pb-10">
        <Odjeljak id="h-brojke" naslov="Upravo sada">
          <Brojke />
        </Odjeljak>

        <Odjeljak id="h-put" naslov="Od oglasa do kartice">
          <ol className="grid gap-2.5">
            {KORACI.map(([b, t], i) => (
              <li
                key={b}
                className="relative rounded-2xl border bg-card py-3.5 pr-4 pl-15 shadow-xs"
              >
                <span
                  aria-hidden
                  className="absolute top-3.5 left-4 grid size-7.5 place-items-center rounded-full bg-primary font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <b className="mb-0.5 block">{b}</b>
                <span className="text-sm text-muted-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </Odjeljak>

        <Odjeljak id="h-izvori" naslov="Odakle su podaci">
          <p className="text-muted-foreground">
            Zelena točka znači da je izvor zadnji put radio bez greške. Ako neki izvor ne radi,
            ostali oglasi ostaju, a ništa se ne označava kao nestalo dok se izvor ne vrati.
          </p>
          <SkupineIzvora />
        </Odjeljak>

        <Odjeljak id="h-svjeze" naslov="Koliko je svježe">
          <p>
            Stranica se osvježava svakih sat vremena, a vrijeme zadnjeg osvježavanja uvijek piše na
            dnu ponude. Koliko brzo se novi oglas pojavi ovisi o izvoru: s Crozille gotovo odmah
            (njezina e-mail obavijest stiže čim se oglas objavi), s Realitice unutar sat vremena, s
            agencija unutar dva, s manjih portala unutar četiri sata, a s Njuškala i Indexa jednom
            dnevno, kad stigne njihova dnevna obavijest. Natječaji i dražbe provjeravaju se dvaput
            dnevno. Tome se doda najviše sat vremena do sljedećeg osvježavanja stranice.
          </p>
          <p>
            Oglas koji nestane s portala ili agencije prelazi u &quot;Nestali&quot; nakon tri
            provjere zaredom. Oglasi koji dolaze samo e-mail obavijestima (Njuškalo, Index,
            Crozilla) smatraju se nestalima kad nestanu sa svih ostalih izvora ili kad ih 60 dana
            nitko ne vidi.
          </p>
        </Odjeljak>

        <Odjeljak id="h-pitanja" naslov="Česta pitanja">
          <div className="grid gap-2">
            {PITANJA.map(([q, a]) => (
              <details key={q} className="rounded-xl border bg-card px-3.5 py-3">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Odjeljak>

        <div className="text-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Pogledaj ponudu
          </Link>
        </div>
      </main>

      <footer className="mx-auto grid max-w-[860px] gap-3 px-4 pb-10 text-sm text-muted-foreground">
        <Osvjezeno />
        <ThemeSwitch className="justify-self-start" />
      </footer>
    </>
  )
}
