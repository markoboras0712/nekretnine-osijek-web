import Link from 'next/link'
import { Hero } from '@/components/Hero'
import { HeroBrojke } from '@/components/HeroBrojke'
import { PonudaLoader } from '@/components/PonudaLoader'

export default function Pocetna() {
  return (
    <>
      <Hero labelledBy="naslov">
        <p className="m-0 text-xs tracking-[0.08em] text-[#a8d8c6] uppercase">
          Osijek · Antunovac · Bilje · Čepin · Petrijevci · Valpovo
        </p>
        <h1
          id="naslov"
          className="max-w-[17em] text-[clamp(1.6rem,5.2vw,2.9rem)] leading-[1.1] font-bold tracking-tight"
        >
          Svaka nekretnina na prodaju u Osijeku i okolici. Na jednom mjestu.
        </h1>
        <p className="m-0 max-w-[40em] text-[clamp(0.95rem,2.4vw,1.08rem)] text-[#d3e6de]">
          Portali, lokalne agencije, javni natječaji i dražbe, skupljeni, očišćeni od duplikata i
          uspoređeni s prosječnom cijenom mjesta. Osvježava se svakih sat vremena.
        </p>
        <HeroBrojke />
        <div className="mt-1 flex flex-wrap gap-2.5">
          <a
            href="#ponuda"
            className="rounded-lg border border-[#f3f7f4] bg-[#f3f7f4] px-4.5 py-2 font-semibold text-[#0f3d33] hover:bg-white"
          >
            Pogledaj ponudu
          </a>
          <Link
            href="/o-alatu/"
            className="rounded-lg border border-white/50 px-4.5 py-2 text-white hover:bg-white/10"
          >
            Kako radi
          </Link>
        </div>
      </Hero>
      <PonudaLoader />
    </>
  )
}
