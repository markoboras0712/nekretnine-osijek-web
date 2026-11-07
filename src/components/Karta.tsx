'use client'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Button } from '@/components/ui/button'
import { KOORD, krugovi, polumjer, skupine, type Krug } from '@/lib/map'
import type { Nekretnina } from '@/types/podaci'

function ikona(k: Krug, max: number, zoom: number): L.DivIcon {
  const r = polumjer(k.broj, max, zoom)
  const klase = (k.oznacen ? ' oznacen' : '') + (k.nepoznat ? ' nepoznat' : '')
  return L.divIcon({
    className: 'mjehur-omot',
    html: `<div class="mjehur${klase}" style="width:${2 * r}px;height:${2 * r}px"><b>${Number(k.broj)}</b></div>`,
    iconSize: [2 * r, 2 * r],
    iconAnchor: [r, r],
  })
}

/** Fits the map to the circles on first show and whenever the set of places changes. */
function Prilagodi({ granice, otisak }: { granice: [number, number][]; otisak: string }) {
  const map = useMap()
  const zadnji = useRef<string | null>(null)
  useEffect(() => {
    if (otisak === zadnji.current || !granice.length) return
    zadnji.current = otisak
    map.fitBounds(granice, { padding: [30, 30], maxZoom: 14, animate: false })
  }, [map, granice, otisak])
  return null
}

type Props = {
  lista: readonly Nekretnina[]
  mjesta: readonly string[]
  odaberi: (naziv: string) => void
}

function Krugovi({ lista, mjesta, odaberi }: Props) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  const sk = useMemo(() => skupine(lista, mjesta), [lista, mjesta])
  const { krugovi: kr, max } = useMemo(() => krugovi(sk, zoom), [sk, zoom])
  // Fit to the places themselves, not to the merged city circle of the current zoom.
  const granice = useMemo(() => krugovi(sk, 99).krugovi.map((k) => k.k), [sk])
  const otisak = useMemo(
    () =>
      sk
        .map((s) => s.naziv + s.broj)
        .sort()
        .join(),
    [sk],
  )
  // New icon objects make react-leaflet swap the marker element, so build them only when the
  // circles change, not on every re-render of the page.
  const ikone = useMemo(() => kr.map((k) => ikona(k, max, zoom)), [kr, max, zoom])
  const uGrad = useMemo(
    () => ({ click: () => map.setView(KOORD.Osijek as [number, number], 13.5) }),
    [map],
  )

  return (
    <>
      <Prilagodi granice={granice} otisak={otisak} />
      {kr.map((k, i) => {
        // smaller circles above larger ones, so all can be clicked
        const z = Math.round(1000 * (1 - k.broj / max))
        // Leaflet reads `title` only when the marker is created, so the count is part of the key.
        return k.grad ? (
          <Marker
            key={`__grad:${k.broj}`}
            position={k.k}
            icon={ikone[i]}
            title={`Osijek (grad): ${k.broj} — klikni za kvartove`}
            zIndexOffset={z}
            riseOnHover
            eventHandlers={uGrad}
          />
        ) : (
          <Marker
            key={`${k.naziv}:${k.broj}`}
            position={k.k}
            icon={ikone[i]}
            title={`${k.naziv}: ${k.broj}`}
            zIndexOffset={z}
            riseOnHover
          >
            <Popup maxWidth={260}>
              <div className="grid gap-0.5 text-sm">
                <b>{k.nepoznat ? 'Osijek, kvart nije naveden' : k.naziv}</b>
                <div>{k.broj} nekretnina</div>
                {k.redovi.map((r) => (
                  <div key={r} className="text-xs text-muted-foreground">
                    {r}
                  </div>
                ))}
                {!k.nepoznat && (
                  <Button
                    size="sm"
                    className="mt-1.5 justify-self-start"
                    onClick={() => odaberi(k.naziv)}
                  >
                    Prikaži popis
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

/** One circle per neighbourhood / village for the filtered list (Leaflet + OpenStreetMap). */
export function Karta(props: Props) {
  return (
    <div role="region" aria-label="Karta nekretnina po kvartovima i naseljima">
      <MapContainer
        center={[45.56, 18.66]}
        zoom={11}
        zoomSnap={0.5}
        scrollWheelZoom={false}
        className="karta h-[62vh] min-h-80 rounded-2xl border sm:h-[min(70vh,620px)] sm:min-h-90"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Krugovi {...props} />
      </MapContainer>
    </div>
  )
}
