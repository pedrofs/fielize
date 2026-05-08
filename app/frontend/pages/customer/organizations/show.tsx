import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Link } from "@inertiajs/react"
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
  primaryColor: string | null
  secondaryColor: string | null
  bioHtml: string | null
  heroImageUrl: string | null
}

type CampaignLink = {
  id: string
  slug: string
  name: string
  kind: "organization" | "loyalty"
  url: string
}

type Merchant = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  campaigns: CampaignLink[]
}

type CampaignCard = {
  id: string
  slug: string
  name: string
  heroImageUrl: string | null
  prizeHighlight: string | null
  url: string
}

type MapCenter = {
  latitude: number
  longitude: number
} | null

type Props = {
  organization: Organization
  merchants: Merchant[]
  campaigns: CampaignCard[]
  mapCenter: MapCenter
  emptyState: boolean
}

function OrgHeader({ organization }: { organization: Organization }) {
  return (
    <header className="flex flex-col gap-4 pt-6 pb-6">
      {organization.heroImageUrl && (
        <img
          src={organization.heroImageUrl}
          alt=""
          className="-mx-4 h-44 w-screen max-w-screen-sm object-cover sm:mx-0 sm:w-full sm:rounded-lg"
          data-testid="org-hero-image"
        />
      )}
      <div className="flex flex-col items-center gap-3 text-center">
        {organization.imageUrl && (
          <img
            src={organization.imageUrl}
            alt={organization.name ?? ""}
            className="size-20 rounded-full border-4 border-background object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold tracking-tight">
          {organization.name}
        </h1>
        {organization.bioHtml && (
          <div
            className="prose prose-sm max-w-none text-sm text-muted-foreground"
            data-testid="org-bio"
            dangerouslySetInnerHTML={{ __html: organization.bioHtml }}
          />
        )}
      </div>
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

function CampaignCardItem({ campaign }: { campaign: CampaignCard }) {
  return (
    <Link
      href={campaign.url}
      className="flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/30"
      data-testid="campaign-card"
    >
      {campaign.heroImageUrl ? (
        <img
          src={campaign.heroImageUrl}
          alt=""
          className="h-32 w-full object-cover"
        />
      ) : (
        <div
          className="h-32 w-full"
          style={{ background: "var(--primary, #e5e7eb)" }}
          data-testid="campaign-card-band"
        />
      )}
      <div className="flex flex-col gap-1 p-4">
        <span className="font-semibold">{campaign.name}</span>
        {campaign.prizeHighlight && (
          <span className="text-sm text-muted-foreground">
            Prêmio: {campaign.prizeHighlight}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function CustomerOrganizationShow({
  organization,
  merchants,
  campaigns,
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

      <section
        className="flex flex-col gap-3 pb-6"
        data-testid="campaigns-section"
      >
        <h2 className="text-base font-semibold">Campanhas ativas</h2>
        {campaigns.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="campaigns-empty"
          >
            Nenhuma campanha ativa no momento.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCardItem campaign={campaign} />
              </li>
            ))}
          </ul>
        )}
      </section>

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
              <div className="flex flex-col gap-2 p-4 pt-0">
                <h3 className="text-sm font-semibold">
                  Campanhas ativas neste lojista
                </h3>
                {selected.campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma campanha ativa neste lojista.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {selected.campaigns.map((campaign) => (
                      <li key={campaign.id}>
                        <Link
                          href={campaign.url}
                          className="flex flex-col rounded-md border bg-card p-3 hover:bg-accent/30"
                          data-testid="sheet-campaign-link"
                        >
                          <span className="text-sm font-medium">
                            {campaign.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {campaign.kind === "loyalty"
                              ? "Cartão fidelidade"
                              : "Campanha"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
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
