import { useEffect, useRef } from "react"
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet"
import type { LeafletEvent, Marker as LeafletMarker } from "leaflet"

import { defaultIcon } from "@/lib/leaflet-icon"

const FALLBACK_CENTER: [number, number] = [-31.5, -52.5]

function CenterOnPin({
  latitude,
  longitude,
}: {
  latitude: number | null
  longitude: number | null
}) {
  const map = useMap()
  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 14))
    }
  }, [latitude, longitude, map])
  return null
}

type Props = {
  latitude: number | null
  longitude: number | null
  onChange?: (lat: number, lng: number) => void
}

export function MerchantMapWidget({ latitude, longitude, onChange }: Props) {
  const markerRef = useRef<LeafletMarker | null>(null)
  const editable = !!onChange

  const center: [number, number] =
    latitude != null && longitude != null
      ? [latitude, longitude]
      : FALLBACK_CENTER

  return (
    <div
      className="h-64 w-full overflow-hidden rounded-lg border"
      data-testid="merchant-map-widget"
    >
      <MapContainer
        center={center}
        zoom={latitude != null ? 14 : 6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latitude != null && longitude != null && (
          <Marker
            ref={markerRef}
            position={[latitude, longitude]}
            icon={defaultIcon}
            draggable={editable}
            eventHandlers={
              editable
                ? {
                    dragend: (event: LeafletEvent) => {
                      const marker = event.target as LeafletMarker
                      const { lat, lng } = marker.getLatLng()
                      onChange!(lat, lng)
                    },
                  }
                : undefined
            }
          />
        )}
        <CenterOnPin latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  )
}
