import { Link, usePage } from "@inertiajs/react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  ClockIcon,
  SparklesIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { cn } from "@/lib/utils"

type Tier = {
  name: string
  threshold: number
  reached: boolean
}

type LoyaltyProgress = {
  kind: "loyalty"
  balance: number
  nextThreshold: number | null
  tiers: Tier[]
}

// OrganizationCampaign, cumulative policy: dots toward the next distinct-merchant
// threshold. Crossing a threshold enters the customer in that Raffle ("no sorteio") —
// it is NOT a win.
type CumulativeProgress = {
  kind: "cumulative"
  merchantsStamped: number
  nextThreshold: number | null
  tiers: Tier[]
}

// OrganizationCampaign, simple policy: one Raffle Entry per accumulated stamp
// (capped per day server-side), plus the draw date.
type SimpleProgress = {
  kind: "simple"
  entries: number
  drawAt: string | null
}

type Progress = LoyaltyProgress | CumulativeProgress | SimpleProgress

type CardState =
  | "collecting"
  | "redeemable"
  | "awaiting_draw"
  | "won"
  | "redeemed"
  | "lost"
  | "disabled"

type Card = {
  id: string
  state: CardState
  section: string
  campaignName: string
  organization: { name: string | null; imageUrl: string | null }
  url: string
  progress: Progress
}

type Sections = {
  paraResgatar: Card[]
  ativas: Card[]
  encerradas: Card[]
}

type Wallet = {
  recognized: boolean
  sections: Sections
}

type Props = {
  wallet: Wallet
}

// Punchcards cap the rendered dots so a high threshold doesn't blow out the row;
// past the cap we fall back to a numeric summary.
const MAX_DOTS = 12
// The simple-policy entry strip grows one dot per Raffle Entry; beyond the cap
// it collapses the tail into a `+N` overflow indicator.
const MAX_ENTRY_DOTS = 12

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function OrgLabel({ organization }: { organization: Card["organization"] }) {
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

function StatusBadge({ state }: { state: CardState }) {
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

function WonBody({ organization }: { organization: Card["organization"] }) {
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

function CardBody({ card }: { card: Card }) {
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

function WalletCard({ card }: { card: Card }) {
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

function Section({
  title,
  cards,
  testId,
}: {
  title: string
  cards: Card[]
  testId: string
}) {
  if (cards.length === 0) return null

  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {cards.map((card) => (
          <WalletCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}

function CollapsibleSection({
  title,
  cards,
  testId,
}: {
  title: string
  cards: Card[]
  testId: string
}) {
  const [open, setOpen] = useState(false)

  if (cards.length === 0) return null

  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center justify-between text-sm font-semibold tracking-tight text-muted-foreground"
      >
        <span>
          {title} ({cards.length})
        </span>
        {open ? (
          <ChevronUpIcon className="size-4" />
        ) : (
          <ChevronDownIcon className="size-4" />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <WalletCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  )
}

function Placeholder() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
      data-testid="wallet-placeholder"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
        👋
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Bem-vindo à Fielize</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Suas inscrições em campanhas vão aparecer aqui. Acesse a página de uma
        organização e toque em <span className="font-medium">Quero participar</span>{" "}
        para começar.
      </p>
    </article>
  )
}

function FlashToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-3 z-50 mx-auto max-w-screen-sm px-4"
      data-testid="flash-toast"
    >
      <div className="rounded-md bg-foreground/95 px-4 py-3 text-sm text-background shadow-lg">
        {message}
      </div>
    </div>
  )
}

export default function CustomerCardsIndex({ wallet }: Props) {
  const flash = usePage().flash
  const { paraResgatar, ativas, encerradas } = wallet.sections
  const isEmpty =
    paraResgatar.length === 0 &&
    ativas.length === 0 &&
    encerradas.length === 0

  if (!wallet.recognized || isEmpty) {
    return (
      <>
        {flash?.notice && <FlashToast message={flash.notice} />}
        <Placeholder />
      </>
    )
  }

  return (
    <article className="flex flex-col gap-6 py-6">
      {flash?.notice && <FlashToast message={flash.notice} />}

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Meus cartões</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas campanhas em todas as organizações.
        </p>
      </header>

      <div className="flex flex-col gap-6" data-testid="wallet-sections">
        <Section
          title="Para resgatar"
          cards={paraResgatar}
          testId="wallet-section-para-resgatar"
        />
        <Section title="Ativas" cards={ativas} testId="wallet-section-ativas" />
        <CollapsibleSection
          title="Encerradas"
          cards={encerradas}
          testId="wallet-section-encerradas"
        />
      </div>
    </article>
  )
}

CustomerCardsIndex.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
