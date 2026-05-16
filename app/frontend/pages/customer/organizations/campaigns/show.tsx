import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useForm, usePage } from "@inertiajs/react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

const PHONE_DIGITS_RE = /^\d{10,13}$/

function digitsOnly(value: string) {
  return value.replace(/\D/g, "")
}

function isPlausibleBrazilianPhone(value: string) {
  const digits = digitsOnly(value)
  return PHONE_DIGITS_RE.test(digits)
}

type EnrollFormProps = {
  organizationSlug: string
  campaignSlug: string
  recognized: boolean
}

function EnrollForm({ organizationSlug, campaignSlug, recognized }: EnrollFormProps) {
  const { data, setData, post, processing, errors } = useForm({
    enrollment: { name: "", phone: "" },
  })
  const [clientError, setClientError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!recognized) {
      if (data.enrollment.name.trim().length === 0) {
        setClientError("Informe seu nome.")
        return
      }
      if (!isPlausibleBrazilianPhone(data.enrollment.phone)) {
        setClientError("Informe um número de WhatsApp válido com DDD.")
        return
      }
    }
    setClientError(null)
    post(`/o/${organizationSlug}/c/${campaignSlug}/enrollment`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" data-testid="enroll-form">
      {!recognized && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enrollment-name">Nome</Label>
            <Input
              id="enrollment-name"
              name="enrollment[name]"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              value={data.enrollment.name}
              onChange={(e) =>
                setData("enrollment", { ...data.enrollment, name: e.target.value })
              }
              required
              data-testid="enroll-name-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enrollment-phone">WhatsApp</Label>
            <Input
              id="enrollment-phone"
              name="enrollment[phone]"
              type="tel"
              inputMode="tel"
              placeholder="(53) 99999-1111"
              value={data.enrollment.phone}
              onChange={(e) =>
                setData("enrollment", { ...data.enrollment, phone: e.target.value })
              }
              required
              data-testid="enroll-phone-input"
            />
            {(clientError || errors["enrollment.phone"] || errors["enrollment.name"]) && (
              <p className="text-xs text-destructive" data-testid="enroll-error">
                {clientError ?? errors["enrollment.phone"] ?? errors["enrollment.name"]}
              </p>
            )}
          </div>
        </>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={processing}
        data-testid="enroll-cta"
      >
        Quero participar
      </Button>

      <p className="text-xs text-muted-foreground">
        Ao clicar você concorda com os{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
          data-testid="enroll-privacy-link"
        >
          termos de privacidade
        </a>{" "}
        (LGPD).
      </p>
    </form>
  )
}

function EnrolledState() {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border bg-card p-4"
      data-testid="enrolled-state"
    >
      <p className="text-sm font-medium">Você está inscrito 🎉</p>
      <p className="text-sm text-muted-foreground">
        Visite uma das lojas participantes para ganhar seu primeiro selo.
      </p>
    </div>
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

export default function CustomerCampaignShow({ organization, campaign }: Props) {
  const page = usePage()
  const currentCustomer = page.props.currentCustomer
  const flash = page.flash

  const isEnrolled = useMemo(() => {
    if (!currentCustomer) return false
    return currentCustomer.enrolledCampaignIds.includes(campaign.id)
  }, [currentCustomer, campaign.id])

  return (
    <article className="flex flex-col gap-6 pb-10">
      {flash?.notice && <FlashToast message={flash.notice} />}

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

      {isEnrolled ? (
        <EnrolledState />
      ) : (
        <EnrollForm
          organizationSlug={organization.slug}
          campaignSlug={campaign.slug}
          recognized={Boolean(currentCustomer)}
        />
      )}

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
