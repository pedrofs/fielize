import { Link } from "@inertiajs/react"
import {
  CheckIcon,
  CircleIcon,
  ClockIcon,
  SparklesIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react"
import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

export type Tier = {
  name: string
  threshold: number
  reached: boolean
}

export type LoyaltyProgress = {
  kind: "loyalty"
  balance: number
  nextThreshold: number | null
  tiers: Tier[]
}

// OrganizationCampaign, cumulative policy: dots toward the next distinct-merchant
// threshold. Crossing a threshold enters the customer in that Raffle ("no sorteio") —
// it is NOT a win.
export type CumulativeProgress = {
  kind: "cumulative"
  merchantsStamped: number
  nextThreshold: number | null
  tiers: Tier[]
}

// OrganizationCampaign, simple policy: one Raffle Entry per accumulated stamp
// (capped per day server-side), plus the draw date.
export type SimpleProgress = {
  kind: "simple"
  entries: number
  drawAt: string | null
}

export type Progress = LoyaltyProgress | CumulativeProgress | SimpleProgress

export type CardState =
  | "collecting"
  | "redeemable"
  | "awaiting_draw"
  | "won"
  | "redeemed"
  | "lost"
  | "disabled"

export type CardOrganization = { name: string | null; imageUrl: string | null }

// The minimum a Card needs to render its header + body. Both the Wallet card
// (a tappable summary) and the detail screen render from this shape, so the
// progress/state body looks identical in either place.
export type CardPresentation = {
  state: CardState
  organization: CardOrganization
  progress: Progress
}

// A Wallet card: a CardPresentation plus the bits the tappable summary needs.
export type WalletCardData = CardPresentation & {
  id: string
  section: string
  campaignName: string
  url: string
}

// Punchcards cap the rendered dots so a high threshold doesn't blow out the row;
// past the cap we fall back to a numeric summary.
const MAX_DOTS = 12
// The simple-policy entry strip grows one dot per Raffle Entry; beyond the cap
// it collapses the tail into a `+N` overflow indicator.
const MAX_ENTRY_DOTS = 12

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function OrgLabel({ organization }: { organization: CardOrganization }) {
  return (
    <div className="flex items-center gap-2">
      {organization.imageUrl && (
        <img
          src={organization.imageUrl}
          alt=""
          className="size-5 rounded-full border bg-background object-cover"
        />
      )}
      <span className="text-xs font-medium text-muted-foreground">
        {organization.name}
      </span>
    </div>
  )
}

function Badge({
  tone,
  icon: Icon,
  children,
}: {
  tone: "primary" | "muted"
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  )
}

export function StatusBadge({ state }: { state: CardState }) {
  switch (state) {
    case "redeemable":
      return (
        <Badge tone="primary" icon={SparklesIcon}>
          Resgatar
        </Badge>
      )
    case "won":
      return (
        <Badge tone="primary" icon={TrophyIcon}>
          Você ganhou!
        </Badge>
      )
    case "awaiting_draw":
      return (
        <Badge tone="muted" icon={ClockIcon}>
          Aguardando sorteio
        </Badge>
      )
    case "redeemed":
      return <Badge tone="muted">Resgatado</Badge>
    case "lost":
      return <Badge tone="muted">Não contemplado</Badge>
    default:
      return null
  }
}

function Dots({
  filled,
  total,
  unit = "carimbos",
}: {
  filled: number
  total: number
  unit?: string
}) {
  if (total > MAX_DOTS) {
    return (
      <p className="text-sm font-medium tabular-nums">
        {filled} <span className="text-muted-foreground">de {total} {unit}</span>
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "size-4 rounded-full border",
            index < filled
              ? "border-primary bg-primary"
              : "border-border bg-muted",
          )}
        />
      ))}
    </div>
  )
}

// One dot per Raffle Entry, growing as the customer accumulates entries, with a
// `+N` overflow once past the cap so a big tally stays a single tidy row.
function EntryDots({ entries }: { entries: number }) {
  const visible = Math.min(entries, MAX_ENTRY_DOTS)
  const overflow = entries - visible

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: visible }).map((_, index) => (
        <span
          key={index}
          className="size-4 rounded-full border border-primary bg-primary"
          aria-hidden
        />
      ))}
      {overflow > 0 && (
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  )
}

function TierMarkers({ tiers }: { tiers: Tier[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tiers.map((tier) => (
        <li
          key={tier.threshold}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
            tier.reached
              ? "border-primary/40 text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {tier.reached ? (
            <CheckIcon className="size-3" />
          ) : (
            <CircleIcon className="size-3" />
          )}
          <span className="font-medium">{tier.name}</span>
          <span className="opacity-60">· {tier.threshold}</span>
        </li>
      ))}
    </ul>
  )
}

function LoyaltyBody({ progress }: { progress: LoyaltyProgress }) {
  const { balance, nextThreshold, tiers } = progress

  return (
    <>
      {nextThreshold != null ? (
        <div className="flex flex-col gap-2">
          <Dots filled={balance} total={nextThreshold} />
          <p className="text-xs text-muted-foreground">
            {balance} de {nextThreshold} carimbos para o próximo prêmio
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-primary">
          Todos os prêmios liberados · {balance} carimbos
        </p>
      )}

      <TierMarkers tiers={tiers} />
    </>
  )
}

function CumulativeBody({
  progress,
  awaiting,
}: {
  progress: CumulativeProgress
  awaiting: boolean
}) {
  const { merchantsStamped, nextThreshold, tiers } = progress
  const entered = tiers.filter((tier) => tier.reached).length

  return (
    <div className="flex flex-col gap-2">
      {nextThreshold != null ? (
        <>
          <Dots filled={merchantsStamped} total={nextThreshold} unit="lojas" />
          <p className="text-xs text-muted-foreground">
            {merchantsStamped} de {nextThreshold} lojas para entrar no próximo
            sorteio
          </p>
        </>
      ) : (
        <p className="text-sm font-medium text-primary">
          Você entrou em todos os sorteios · {merchantsStamped} lojas
        </p>
      )}

      {entered > 0 && (
        <p className="text-xs font-medium text-primary">
          ✓ Você está em {entered === 1 ? "1 sorteio" : `${entered} sorteios`}
        </p>
      )}

      <TierMarkers tiers={tiers} />

      {awaiting && (
        <p className="text-xs text-muted-foreground">
          A campanha encerrou. Aguardando o sorteio dos prêmios.
        </p>
      )}
    </div>
  )
}

function SimpleBody({
  progress,
  awaiting,
}: {
  progress: SimpleProgress
  awaiting: boolean
}) {
  const { entries, drawAt } = progress

  return (
    <div className="flex flex-col gap-2">
      <EntryDots entries={entries} />
      <p className="text-xs text-muted-foreground">
        {entries === 1 ? "1 chance" : `${entries} chances`} no sorteio
      </p>
      {awaiting ? (
        <p className="text-xs text-muted-foreground">
          A campanha encerrou. Aguardando o sorteio.
        </p>
      ) : (
        drawAt && (
          <p className="text-xs text-muted-foreground">
            Sorteio em {formatDate(drawAt)}
          </p>
        )
      )}
    </div>
  )
}

function WonBody({ organization }: { organization: CardOrganization }) {
  return (
    <div className="rounded-lg bg-primary/10 p-3 text-sm">
      <p className="font-semibold text-primary">🎉 Você ganhou um prêmio!</p>
      <p className="mt-1 text-muted-foreground">
        Entre em contato com {organization.name ?? "a organização"} para retirar
        seu prêmio.
      </p>
    </div>
  )
}

// The state/progress body shared by the Wallet summary and the detail screen.
export function CardBody({ card }: { card: CardPresentation }) {
  if (card.state === "won") return <WonBody organization={card.organization} />
  if (card.state === "lost") {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi dessa vez — o sorteio já foi realizado.
      </p>
    )
  }
  if (card.state === "redeemed") {
    return <p className="text-sm text-muted-foreground">Prêmio resgatado. 🎉</p>
  }

  const awaiting = card.state === "awaiting_draw"

  switch (card.progress.kind) {
    case "loyalty":
      return <LoyaltyBody progress={card.progress} />
    case "cumulative":
      return <CumulativeBody progress={card.progress} awaiting={awaiting} />
    case "simple":
      return <SimpleBody progress={card.progress} awaiting={awaiting} />
  }
}

// A bigger, punch-card-style row of dots for the detail screen, where the card
// earns more visual weight than the compact wallet summary. Empty slots are
// dashed outlines; filled slots are solid with a check.
function HeroDots({ filled, total }: { filled: number; total: number }) {
  if (total > MAX_DOTS) {
    return (
      <p className="text-3xl font-bold tabular-nums">
        {filled}
        <span className="text-lg font-medium text-muted-foreground">
          {" / "}
          {total}
        </span>
      </p>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      aria-hidden
    >
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "flex size-9 items-center justify-center rounded-full border-2",
            index < filled
              ? "border-primary bg-primary text-primary-foreground"
              : "border-dashed border-border bg-muted",
          )}
        >
          {index < filled && <CheckIcon className="size-4" />}
        </span>
      ))}
    </div>
  )
}

function HeroFrame({
  caption,
  children,
}: {
  caption?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border bg-gradient-to-b from-primary/5 to-card p-6 text-center"
      data-testid="card-hero"
    >
      {children}
      {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
    </div>
  )
}

function LoyaltyHero({ progress }: { progress: LoyaltyProgress }) {
  const { balance, nextThreshold, tiers } = progress

  return (
    <div className="flex flex-col gap-4">
      <HeroFrame
        caption={
          nextThreshold != null
            ? `${balance} de ${nextThreshold} carimbos para o próximo prêmio`
            : `${balance} carimbos acumulados`
        }
      >
        {nextThreshold != null ? (
          <HeroDots filled={balance} total={nextThreshold} />
        ) : (
          <p className="text-lg font-semibold text-primary">
            Todos os prêmios liberados 🎉
          </p>
        )}
      </HeroFrame>
      <TierMarkers tiers={tiers} />
    </div>
  )
}

function CumulativeHero({
  progress,
  awaiting,
}: {
  progress: CumulativeProgress
  awaiting: boolean
}) {
  const { merchantsStamped, nextThreshold, tiers } = progress
  const entered = tiers.filter((tier) => tier.reached).length

  return (
    <div className="flex flex-col gap-4">
      <HeroFrame
        caption={
          nextThreshold != null
            ? `${merchantsStamped} de ${nextThreshold} lojas para entrar no próximo sorteio`
            : `${merchantsStamped} lojas visitadas`
        }
      >
        {nextThreshold != null ? (
          <HeroDots filled={merchantsStamped} total={nextThreshold} />
        ) : (
          <p className="text-lg font-semibold text-primary">
            Você entrou em todos os sorteios 🎉
          </p>
        )}
      </HeroFrame>
      {entered > 0 && (
        <p className="text-center text-sm font-medium text-primary">
          ✓ Você está em {entered === 1 ? "1 sorteio" : `${entered} sorteios`}
        </p>
      )}
      <TierMarkers tiers={tiers} />
      {awaiting && (
        <p className="text-center text-xs text-muted-foreground">
          A campanha encerrou. Aguardando o sorteio dos prêmios.
        </p>
      )}
    </div>
  )
}

function SimpleHero({
  progress,
  awaiting,
}: {
  progress: SimpleProgress
  awaiting: boolean
}) {
  const { entries, drawAt } = progress

  return (
    <div className="flex flex-col gap-4">
      <HeroFrame
        caption={
          entries === 1 ? "1 chance no sorteio" : `${entries} chances no sorteio`
        }
      >
        <p className="text-4xl font-bold tabular-nums text-primary">{entries}</p>
        <div className="flex justify-center">
          <EntryDots entries={entries} />
        </div>
      </HeroFrame>
      {awaiting ? (
        <p className="text-center text-xs text-muted-foreground">
          A campanha encerrou. Aguardando o sorteio.
        </p>
      ) : (
        drawAt && (
          <p className="text-center text-xs text-muted-foreground">
            Sorteio em {formatDate(drawAt)}
          </p>
        )
      )}
    </div>
  )
}

// The detail screen's prominent progress hero. Terminal/textual states fall
// back to the shared CardBody — the won/lost/redeemed copy needs no punch-card.
export function HeroProgress({ card }: { card: CardPresentation }) {
  if (card.state === "won" || card.state === "lost" || card.state === "redeemed") {
    return <CardBody card={card} />
  }

  const awaiting = card.state === "awaiting_draw"

  switch (card.progress.kind) {
    case "loyalty":
      return <LoyaltyHero progress={card.progress} />
    case "cumulative":
      return <CumulativeHero progress={card.progress} awaiting={awaiting} />
    case "simple":
      return <SimpleHero progress={card.progress} awaiting={awaiting} />
  }
}

// The tappable Wallet summary: links to the card detail at `/me/cartoes/:id`.
export function WalletCard({ card }: { card: WalletCardData }) {
  return (
    <Link
      href={card.url}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30"
      data-testid="wallet-card"
      data-state={card.state}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <OrgLabel organization={card.organization} />
          <h3 className="font-semibold leading-tight">{card.campaignName}</h3>
        </div>
        <StatusBadge state={card.state} />
      </header>

      <CardBody card={card} />
    </Link>
  )
}
