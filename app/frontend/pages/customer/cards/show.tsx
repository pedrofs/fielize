import { Deferred, Link } from "@inertiajs/react"
import { ArrowLeftIcon, ArrowRightIcon, StoreIcon } from "lucide-react"
import { type ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  HeroProgress,
  OrgLabel,
  StatusBadge,
  type CardState,
  type Progress,
} from "@/components/wallet-card"
import { CustomerLayout } from "@/layouts/customer-layout"

type CardMerchant = {
  id: string
  name: string
  address: string | null
}

type CardPrize = {
  id: string
  name: string
  threshold: number | null
}

type CardDetail = {
  id: string
  state: CardState
  section: string
  kind: "loyalty" | "organization"
  campaignName: string
  organization: { name: string | null; imageUrl: string | null; slug: string }
  progress: Progress
  prizes: CardPrize[]
  merchants: CardMerchant[]
  termsHtml: string | null
  campaignUrl: string
  merchantUrl: string | null
}

// `card` is deferred (see Customer::CardsController#show): absent on the initial
// paint and loaded via a follow-up request, during which the skeleton shows. The
// back-link and page chrome render immediately; only the card body waits.
type Props = {
  card?: CardDetail
}

// Per ADR 0004 the app never transacts a redemption — these are purely
// informational instructions telling the customer how to claim in person.
// A won Raffle's contact copy is already rendered by CardBody's won state, so
// here we only add the loyalty "show your WhatsApp at the counter" path.
function RedemptionInstructions({ card }: { card: CardDetail }) {
  if (card.state !== "redeemable" || card.kind !== "loyalty") return null

  const merchantName = card.merchants[0]?.name ?? "a loja"

  return (
    <div
      className="rounded-lg bg-primary/10 p-3 text-sm"
      data-testid="redemption-instructions"
    >
      <p className="font-semibold text-primary">Pronto para resgatar 🎉</p>
      <p className="mt-1 text-muted-foreground">
        Mostre seu WhatsApp no caixa da {merchantName} para resgatar seu prêmio.
      </p>
    </div>
  )
}

function CardDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      data-testid="card-detail-skeleton"
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  )
}

function CardContent({ card }: { card: CardDetail }) {
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <OrgLabel organization={card.organization} />
            <h1 className="text-2xl font-semibold tracking-tight">
              {card.campaignName}
            </h1>
          </div>
          <StatusBadge state={card.state} />
        </div>
      </header>

      <section className="flex flex-col gap-3" data-testid="card-progress">
        <RedemptionInstructions card={card} />
        <HeroProgress card={card} />
      </section>

      {card.merchantUrl && (
        <Link
          href={card.merchantUrl}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          data-testid="go-to-store"
        >
          <StoreIcon className="size-4" />
          Ir para a loja
        </Link>
      )}

      {card.prizes.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="card-prizes">
          <h2 className="text-base font-semibold">Prêmios</h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {card.prizes.map((prize) => (
              <li
                key={prize.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <span className="font-medium">{prize.name}</span>
                {prize.threshold != null && (
                  <span className="text-sm text-muted-foreground">
                    {prize.threshold} carimbos
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.kind === "organization" && card.merchants.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="card-merchants">
          <h2 className="text-base font-semibold">Lojistas participantes</h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {card.merchants.map((merchant) => (
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
        </section>
      )}

      <Link
        href={card.campaignUrl}
        className="inline-flex items-center justify-center gap-1 rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/30"
        data-testid="campaign-page-link"
      >
        Ver página da campanha
        <ArrowRightIcon className="size-4" />
      </Link>

      {card.termsHtml && (
        <section
          className="prose prose-xs max-w-none text-xs text-muted-foreground"
          data-testid="card-terms"
          dangerouslySetInnerHTML={{ __html: card.termsHtml }}
        />
      )}
    </>
  )
}

export default function CustomerCardShow({ card }: Props) {
  return (
    <article className="flex flex-col gap-6 py-6">
      <Link
        href="/me"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        data-testid="back-to-wallet"
      >
        <ArrowLeftIcon className="size-4" />
        Meus cartões
      </Link>

      <Deferred data="card" fallback={<CardDetailSkeleton />}>
        <CardContent card={card!} />
      </Deferred>
    </article>
  )
}

CustomerCardShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
