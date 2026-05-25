import { Link, usePage } from "@inertiajs/react"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  SparklesIcon,
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

type Card = {
  id: string
  state: "collecting" | "redeemable" | "disabled" | string
  section: string
  campaignName: string
  organization: { name: string | null; imageUrl: string | null }
  url: string
  progress: LoyaltyProgress
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

// A loyalty card is a punchcard: dots toward the next affordable tier, the
// full ladder of tiers as milestone markers, and the current balance. We cap
// the rendered dots so a high next_threshold doesn't blow out the row.
const MAX_DOTS = 12

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

function Dots({ filled, total }: { filled: number; total: number }) {
  if (total > MAX_DOTS) {
    return (
      <p className="text-sm font-medium tabular-nums">
        {filled} <span className="text-muted-foreground">de {total} carimbos</span>
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

function LoyaltyCard({ card }: { card: Card }) {
  const { balance, nextThreshold, tiers } = card.progress
  const redeemable = card.state === "redeemable"

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
        {redeemable && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
            <SparklesIcon className="size-3" />
            Resgatar
          </span>
        )}
      </header>

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
          <LoyaltyCard key={card.id} card={card} />
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
            <LoyaltyCard key={card.id} card={card} />
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
