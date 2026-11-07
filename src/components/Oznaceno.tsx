import { Fragment } from 'react'
import { istakni, norm, type Dio, type Upit } from '@/lib/search'

export function Dijelovi({ dijelovi }: { dijelovi: readonly Dio[] }) {
  return (
    <>
      {dijelovi.map((d, i) =>
        d.mark ? <mark key={i}>{d.tekst}</mark> : <Fragment key={i}>{d.tekst}</Fragment>,
      )}
    </>
  )
}

/** Text with search hits highlighted (never rendered as HTML). */
export function Oznaceno({
  tekst,
  upiti,
  normaliziran,
}: {
  tekst: string
  upiti: readonly Upit[]
  normaliziran?: string
}) {
  if (!upiti.length) return <>{tekst}</>
  return <Dijelovi dijelovi={istakni(tekst, normaliziran ?? norm(tekst), upiti)} />
}
