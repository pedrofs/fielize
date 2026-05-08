import type { ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"

type Organization = {
  id: string
  name: string | null
  slug: string
  imageUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
}

type CampaignMerchant = {
  id: string
  name: string
  address: string | null
}

type CampaignPrize = {
  id: string
  name: string
  threshold: number | null
  position: number
}

type Campaign = {
  id: string
  slug: string
  name: string
  kind: "organization" | "loyalty"
  heroImageUrl: string | null
  descriptionHtml: string | null
  termsHtml: string | null
  prizes: CampaignPrize[]
  merchants: CampaignMerchant[]
}

type Props = {
  organization: Organization
  campaign: Campaign
}

function Hero({ campaign }: { campaign: Campaign }) {
  if (campaign.heroImageUrl) {
    return (
      <img
        src={campaign.heroImageUrl}
        alt=""
        className="-mx-4 h-44 w-screen max-w-screen-sm object-cover sm:mx-0 sm:w-full sm:rounded-lg"
        data-testid="campaign-hero-image"
      />
    )
  }
  return (
    <div
      className="-mx-4 h-44 w-screen max-w-screen-sm sm:mx-0 sm:w-full sm:rounded-lg"
      style={{ background: "var(--primary, #e5e7eb)" }}
      data-testid="campaign-hero-band"
    />
  )
}

export default function CustomerCampaignShow({ organization, campaign }: Props) {
  return (
    <article className="flex flex-col gap-6 pb-10">
      <Hero campaign={campaign} />

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {organization.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {campaign.name}
        </h1>
      </header>

      {campaign.descriptionHtml && (
        <section
          className="prose prose-sm max-w-none text-sm text-foreground"
          data-testid="campaign-description"
          dangerouslySetInnerHTML={{ __html: campaign.descriptionHtml }}
        />
      )}

      {campaign.prizes.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="campaign-prizes">
          <h2 className="text-base font-semibold">Prêmios</h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {campaign.prizes.map((prize) => (
              <li
                key={prize.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <span className="font-medium">{prize.name}</span>
                {prize.threshold != null && (
                  <span className="text-sm text-muted-foreground">
                    {prize.threshold} stamps
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {campaign.merchants.length > 0 && (
        <section
          className="flex flex-col gap-2"
          data-testid="campaign-merchants"
        >
          <h2 className="text-base font-semibold">Lojistas participantes</h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {campaign.merchants.map((merchant) => (
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

      <Button
        type="button"
        size="lg"
        className="w-full"
        data-testid="enroll-cta"
        disabled
      >
        Quero participar
      </Button>

      {campaign.termsHtml && (
        <section
          className="prose prose-xs max-w-none text-xs text-muted-foreground"
          data-testid="campaign-terms"
          dangerouslySetInnerHTML={{ __html: campaign.termsHtml }}
        />
      )}
    </article>
  )
}

CustomerCampaignShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
