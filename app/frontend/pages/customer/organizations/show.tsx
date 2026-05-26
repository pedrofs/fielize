import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import {
  ChevronDownIcon,
  ClockIcon,
  MapIcon,
  MapPinIcon,
  NavigationIcon,
} from "lucide-react"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceKm, haversineKm } from "@/lib/distance"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { defaultIcon, selectedIcon } from "@/lib/leaflet-icon"
import { cn } from "@/lib/utils"

type MappableMerchant = Merchant & { latitude: number; longitude: number }

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
  slug: string
  address: string | null
  latitude: number | null
  longitude: number | null
  campaigns: CampaignLink[]
}

type CampaignProgress =
  | { kind: "cumulative"; merchantsStamped: number; nextThreshold: number | null }
  | { kind: "simple"; entries: number }

type CampaignCard = {
  id: string
  slug: string
  name: string
  heroImageUrl: string | null
  prizeHighlight: string | null
  url: string
  daysRemaining: number | null
  progress: CampaignProgress | null
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
  const hasLogo = Boolean(organization.imageUrl)
  return (
    <header className="flex flex-col pt-6 pb-6">
      {/* Backdrop: the hero image when set, otherwise a primary → secondary
          gradient so the header never reads as unconfigured. Both inherit the
          org's theme tokens (set in CustomerLayout) and fall back to the
          default theme when the org has no custom colors. */}
      <div className="relative -mx-4 sm:mx-0">
        {organization.heroImageUrl ? (
          <img
            src={organization.heroImageUrl}
            alt=""
            className="h-44 w-full object-cover sm:rounded-lg"
            data-testid="org-hero-image"
          />
        ) : (
          <div
            className="h-44 w-full sm:rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), var(--accent))",
            }}
            data-testid="org-hero-gradient"
          />
        )}
        {organization.imageUrl && (
          <img
            src={organization.imageUrl}
            alt={organization.name ?? ""}
            className="absolute -bottom-10 left-4 size-20 rounded-full border-4 border-background object-cover"
            data-testid="org-logo"
          />
        )}
      </div>
      {/* Name + bio, offset to clear the overlapping logo. Left-aligned so
          they read as one branded unit and multi-line bios stay legible. */}
      <div className={`flex flex-col gap-2 ${hasLogo ? "pt-12" : "pt-4"}`}>
        <h1 className="text-2xl font-semibold tracking-tight">
          {organization.name}
        </h1>
        {organization.bioHtml && (
          <div
            className="prose prose-sm max-w-none text-left text-sm text-muted-foreground"
            data-testid="org-bio"
            dangerouslySetInnerHTML={{ __html: organization.bioHtml }}
          />
        )}
      </div>
    </header>
  )
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function campaignCountLabel(count: number): string {
  if (count === 0) return "Sem campanhas aqui"
  if (count === 1) return "1 campanha aqui"
  return `${count} campanhas aqui`
}

// Only surface a deadline once it's close enough to motivate action — a date
// months out reads as noise, not urgency.
const URGENCY_WINDOW_DAYS = 14

function deadlineLabel(daysRemaining: number | null): string | null {
  if (daysRemaining == null || daysRemaining < 0) return null
  if (daysRemaining > URGENCY_WINDOW_DAYS) return null
  if (daysRemaining === 0) return "Encerra hoje"
  if (daysRemaining === 1) return "Encerra amanhã"
  return `Encerra em ${daysRemaining} dias`
}

// Compact "where you are" summary shown in place of a static enrolled badge.
function progressLabel(progress: CampaignProgress): string {
  if (progress.kind === "cumulative") {
    return progress.nextThreshold == null
      ? "Completo"
      : `${progress.merchantsStamped}/${progress.nextThreshold} lojas`
  }
  return `${progress.entries} ${progress.entries === 1 ? "chance" : "chances"}`
}

function MerchantCard({
  merchant,
  primaryColor,
  mappable,
  selected,
  distanceKm,
  onLocate,
  rowRef,
}: {
  merchant: Merchant
  primaryColor: string | null
  mappable: boolean
  selected: boolean
  distanceKm: number | null
  onLocate: () => void
  rowRef: (el: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={rowRef}
      data-testid="merchant-row"
      data-selected={selected || undefined}
      className={cn(
        "flex items-center transition-colors",
        selected && "bg-accent/40 ring-2 ring-inset ring-primary",
      )}
    >
      <Link
        href={`/m/${merchant.slug}`}
        className="flex min-w-0 flex-1 items-center gap-3 p-4 transition-colors hover:bg-accent/30"
        data-testid="merchant-card"
      >
        <Avatar size="lg" data-testid="merchant-monogram">
          <AvatarFallback
            className="font-semibold"
            style={
              primaryColor
                ? {
                    color: primaryColor,
                    backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`,
                  }
                : undefined
            }
          >
            {monogram(merchant.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{merchant.name}</span>
          {merchant.address && (
            <span className="truncate text-sm text-muted-foreground">
              {merchant.address}
            </span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              data-testid="merchant-campaign-count"
            >
              {campaignCountLabel(merchant.campaigns.length)}
            </span>
            {distanceKm != null && (
              <span
                className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                data-testid="merchant-distance"
              >
                <NavigationIcon className="size-3" />
                {`a ${formatDistanceKm(distanceKm)}`}
              </span>
            )}
          </div>
        </div>
      </Link>
      {mappable && (
        <button
          type="button"
          onClick={onLocate}
          aria-label={`Ver ${merchant.name} no mapa`}
          aria-pressed={selected}
          data-testid="merchant-locate"
          className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MapPinIcon className="size-5" />
        </button>
      )}
    </div>
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

// Pans the map onto the selected merchant whenever the selection changes, so a
// tap on a card (which may have opened the map) brings its marker into view.
function PanToSelected({ merchant }: { merchant: MappableMerchant | null }) {
  const map = useMap()
  useEffect(() => {
    if (merchant) {
      map.setView(
        [merchant.latitude, merchant.longitude],
        Math.max(map.getZoom(), 15),
        { animate: true },
      )
    }
  }, [merchant, map])
  return null
}

function MerchantsMap({
  merchants,
  center,
  selectedId,
  onSelectMarker,
}: {
  merchants: MappableMerchant[]
  center: { latitude: number; longitude: number }
  selectedId: string | null
  onSelectMarker: (merchant: MappableMerchant) => void
}) {
  const selected = merchants.find((m) => m.id === selectedId) ?? null

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
        {merchants.map((merchant) => {
          const isSelected = merchant.id === selectedId
          return (
            <Marker
              key={merchant.id}
              position={[merchant.latitude, merchant.longitude]}
              icon={isSelected ? selectedIcon : defaultIcon}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{ click: () => onSelectMarker(merchant) }}
            />
          )
        })}
        <PanToSelected merchant={selected} />
      </MapContainer>
    </div>
  )
}

function CampaignCardItem({
  campaign,
  enrolled,
}: {
  campaign: CampaignCard
  enrolled: boolean
}) {
  const deadline = deadlineLabel(campaign.daysRemaining)

  return (
    <Link
      href={campaign.url}
      className="flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/30"
      data-testid="campaign-card"
      data-enrolled={enrolled || undefined}
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
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{campaign.name}</span>
          {enrolled && (
            <span
              className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
              data-testid="enrolled-badge"
            >
              {campaign.progress ? progressLabel(campaign.progress) : "Inscrito"}
            </span>
          )}
        </div>
        {campaign.prizeHighlight && (
          <span className="text-sm text-muted-foreground">
            Prêmio: {campaign.prizeHighlight}
          </span>
        )}
        {deadline && (
          <span
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground"
            data-testid="campaign-card-deadline"
          >
            <ClockIcon className="size-3" />
            {deadline}
          </span>
        )}
        <span
          className="mt-1 text-sm font-medium text-primary"
          data-testid="campaign-card-cta"
        >
          {enrolled ? "Continuar →" : "Inscrever-se →"}
        </span>
      </div>
    </Link>
  )
}

type SortMode = "alpha" | "nearest"
type GeoStatus = "idle" | "locating" | "ready" | "error"

// Segmented A–Z / nearest toggle. Location is requested only when the customer
// taps "Mais próximos" (never on load), so the permission prompt stays an
// explicit, opt-in action rather than an intrusive page-entry interruption.
function SortControl({
  mode,
  status,
  onAlpha,
  onNearest,
}: {
  mode: SortMode
  status: GeoStatus
  onAlpha: () => void
  onNearest: () => void
}) {
  const locating = status === "locating"
  return (
    <div className="flex flex-col items-end gap-1">
      <div
        role="group"
        aria-label="Ordenar lojistas"
        data-testid="sort-control"
        className="inline-flex rounded-full border bg-card p-0.5 text-xs font-medium"
      >
        <button
          type="button"
          onClick={onAlpha}
          aria-pressed={mode === "alpha"}
          data-testid="sort-alpha"
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            mode === "alpha"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          A–Z
        </button>
        <button
          type="button"
          onClick={onNearest}
          aria-pressed={mode === "nearest"}
          disabled={locating}
          data-testid="sort-nearest"
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors disabled:opacity-60",
            mode === "nearest"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <NavigationIcon className="size-3" />
          {locating ? "Localizando…" : "Mais próximos"}
        </button>
      </div>
      {status === "error" && (
        <span
          className="text-xs text-muted-foreground"
          data-testid="geo-error"
        >
          Não foi possível obter sua localização.
        </span>
      )}
    </div>
  )
}

export default function CustomerOrganizationShow({
  organization,
  merchants,
  campaigns,
  mapCenter,
  emptyState,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [sheetMerchant, setSheetMerchant] = useState<Merchant | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>("alpha")
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle")
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { props } = usePage()
  const enrolledIds = useMemo(
    () => new Set(props.currentCustomer?.enrolledCampaignIds ?? []),
    [props.currentCustomer],
  )

  const mappableMerchants = useMemo(
    () =>
      merchants.filter(
        (m): m is MappableMerchant => m.latitude != null && m.longitude != null,
      ),
    [merchants],
  )

  // Distance (km) from the customer to each merchant with coordinates. Empty
  // until the customer grants location; merchants without coordinates are
  // simply absent from the map.
  const distanceById = useMemo(() => {
    if (!origin) return {} as Record<string, number>
    const out: Record<string, number> = {}
    for (const m of merchants) {
      if (m.latitude != null && m.longitude != null) {
        out[m.id] = haversineKm(origin, { lat: m.latitude, lng: m.longitude })
      }
    }
    return out
  }, [merchants, origin])

  // Nearest-first only once we have a fix; otherwise the server's alphabetical
  // order is preserved untouched. Merchants without coordinates sink to the
  // bottom, keeping their relative (name) order.
  const sortedMerchants = useMemo(() => {
    if (sortMode !== "nearest" || !origin) return merchants
    return [...merchants].sort((a, b) => {
      const da = distanceById[a.id]
      const db = distanceById[b.id]
      if (da == null && db == null) return 0
      if (da == null) return 1
      if (db == null) return -1
      return da - db
    })
  }, [merchants, sortMode, origin, distanceById])

  function sortAlphabetically() {
    setSortMode("alpha")
  }

  // Reuse a previous fix if we have one; otherwise prompt for location and only
  // switch to nearest-first on success. Denial/unavailability leaves the list
  // alphabetical and surfaces a quiet inline message.
  function sortByNearest() {
    if (origin) {
      setSortMode("nearest")
      return
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error")
      return
    }
    setGeoStatus("locating")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus("ready")
        setSortMode("nearest")
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  // From a card: highlight the merchant and reveal its marker on the map.
  function locateOnMap(merchant: Merchant) {
    setSelectedId(merchant.id)
    setMapOpen(true)
  }

  // From a marker: highlight the matching card, scroll it into view, and open
  // its detail sheet — so the two representations stay in sync.
  function selectFromMarker(merchant: MappableMerchant) {
    setSelectedId(merchant.id)
    setSheetMerchant(merchant)
    requestAnimationFrame(() => {
      rowRefs.current[merchant.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
  }

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
                <CampaignCardItem
                  campaign={campaign}
                  enrolled={enrolledIds.has(campaign.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Lojistas participantes</h2>
          {/* Distance sort is only meaningful for multi-merchant orgs with
              coordinates on the map. */}
          {mappableMerchants.length > 1 && (
            <SortControl
              mode={sortMode}
              status={geoStatus}
              onAlpha={sortAlphabetically}
              onNearest={sortByNearest}
            />
          )}
        </div>

        {merchants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lojista cadastrado ainda.
          </p>
        ) : (
          <>
            {/* Cards lead the section — the primary way to reach a store. */}
            <ul className="flex flex-col divide-y rounded-lg border bg-card">
              {sortedMerchants.map((merchant) => (
                <li key={merchant.id}>
                  <MerchantCard
                    merchant={merchant}
                    primaryColor={organization.primaryColor}
                    mappable={
                      merchant.latitude != null && merchant.longitude != null
                    }
                    selected={selectedId === merchant.id}
                    distanceKm={
                      sortMode === "nearest"
                        ? (distanceById[merchant.id] ?? null)
                        : null
                    }
                    onLocate={() => locateOnMap(merchant)}
                    rowRef={(el) => {
                      rowRefs.current[merchant.id] = el
                    }}
                  />
                </li>
              ))}
            </ul>

            {/* The map is demoted to a collapsible preview below the cards,
                kept in sync with the list via the shared selection. */}
            {mappableMerchants.length > 0 && mapCenter ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setMapOpen((open) => !open)}
                  aria-expanded={mapOpen}
                  data-testid="map-toggle"
                  className="flex w-fit items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <MapIcon className="size-4" />
                  {mapOpen ? "Ocultar mapa" : "Ver no mapa"}
                  <ChevronDownIcon
                    className={cn(
                      "size-4 transition-transform",
                      mapOpen && "rotate-180",
                    )}
                  />
                </button>
                {mapOpen && (
                  <MerchantsMap
                    merchants={mappableMerchants}
                    center={mapCenter}
                    selectedId={selectedId}
                    onSelectMarker={selectFromMarker}
                  />
                )}
              </div>
            ) : (
              <div
                className="flex h-32 items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground"
                data-testid="map-placeholder"
              >
                Localizações em breve
              </div>
            )}
          </>
        )}
      </section>

      <Sheet
        open={sheetMerchant !== null}
        onOpenChange={(open) => !open && setSheetMerchant(null)}
      >
        <SheetContent side="bottom" data-testid="merchant-sheet">
          {sheetMerchant && (
            <>
              <SheetHeader>
                <SheetTitle>{sheetMerchant.name}</SheetTitle>
                {sheetMerchant.address && (
                  <SheetDescription asChild>
                    <span>
                      <MapsLink merchant={sheetMerchant} />
                    </span>
                  </SheetDescription>
                )}
              </SheetHeader>
              <div className="flex flex-col gap-2 p-4 pt-0">
                <Link
                  href={`/m/${sheetMerchant.slug}`}
                  className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="sheet-merchant-link"
                >
                  Ver loja →
                </Link>
                <h3 className="text-sm font-semibold">
                  Campanhas ativas neste lojista
                </h3>
                {sheetMerchant.campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma campanha ativa neste lojista.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {sheetMerchant.campaigns.map((campaign) => (
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
