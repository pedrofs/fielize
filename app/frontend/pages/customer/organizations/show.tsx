import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { MapContainer, Marker, TileLayer } from "react-leaflet"

import { CustomerLayout } from "@/layouts/customer-layout"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { defaultIcon } from "@/lib/leaflet-icon"

type Organization = {
  id: string
  name: string | null
  slug: string
  imageUrl: string | null
}

type Merchant = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
}

type MapCenter = {
  latitude: number
  longitude: number
} | null

type Props = {
  organization: Organization
  merchants: Merchant[]
  mapCenter: MapCenter
  emptyState: boolean
}

function OrgHeader({ organization }: { organization: Organization }) {
  return (
    <header className="flex flex-col items-center gap-3 pt-8 pb-6 text-center">
      {organization.imageUrl && (
        <img
          src={organization.imageUrl}
          alt={organization.name ?? ""}
          className="size-20 rounded-full object-cover"
        />
      )}
      <h1 className="text-2xl font-semibold tracking-tight">
        {organization.name}
      </h1>
    </header>
  )
}

function MapsLink({ merchant }: { merchant: Merchant }) {
  if (!merchant.address) return null
  const href =
    merchant.latitude != null && merchant.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${merchant.latitude},${merchant.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant.address)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-primary underline-offset-4 hover:underline"
    >
      {merchant.address}
    </a>
  )
}

function MerchantsMap({
  merchants,
  center,
  onSelect,
}: {
  merchants: Merchant[]
  center: { latitude: number; longitude: number }
  onSelect: (merchant: Merchant) => void
}) {
  return (
    <div
      className="h-64 w-full overflow-hidden rounded-lg border"
      data-testid="merchants-map"
    >
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {merchants.map((merchant) => (
          <Marker
            key={merchant.id}
            position={[merchant.latitude!, merchant.longitude!]}
            icon={defaultIcon}
            eventHandlers={{ click: () => onSelect(merchant) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default function CustomerOrganizationShow({
  organization,
  merchants,
  mapCenter,
  emptyState,
}: Props) {
  const [selected, setSelected] = useState<Merchant | null>(null)

  const mappableMerchants = useMemo(
    () =>
      merchants.filter(
        (m): m is Merchant & { latitude: number; longitude: number } =>
          m.latitude != null && m.longitude != null,
      ),
    [merchants],
  )

  if (emptyState) {
    return (
      <>
        <OrgHeader organization={organization} />
        <section className="flex flex-1 items-center justify-center">
          <p
            className="max-w-xs text-center text-sm text-muted-foreground"
            data-testid="empty-state"
          >
            Esta organização ainda está sendo configurada. Volte em breve!
          </p>
        </section>
      </>
    )
  }

  return (
    <>
      <OrgHeader organization={organization} />

      <section className="flex flex-col gap-3 pb-6">
        {mappableMerchants.length > 0 && mapCenter ? (
          <MerchantsMap
            merchants={mappableMerchants}
            center={mapCenter}
            onSelect={setSelected}
          />
        ) : (
          <div
            className="flex h-32 items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground"
            data-testid="map-placeholder"
          >
            Localizações em breve
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Lojistas participantes</h2>

        {merchants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lojista cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {merchants.map((merchant) => (
              <li key={merchant.id} className="flex flex-col gap-1 p-4">
                <span className="font-medium">{merchant.name}</span>
                {merchant.address && (
                  <span className="text-sm text-muted-foreground">
                    {merchant.address}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="bottom" data-testid="merchant-sheet">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                {selected.address && (
                  <SheetDescription asChild>
                    <span>
                      <MapsLink merchant={selected} />
                    </span>
                  </SheetDescription>
                )}
              </SheetHeader>
              <div className="flex flex-col gap-1 p-4 pt-0">
                <h3 className="text-sm font-semibold">
                  Campanhas ativas neste lojista
                </h3>
                <p className="text-sm text-muted-foreground">
                  Em breve.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

CustomerOrganizationShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
