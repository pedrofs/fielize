import { router, useForm, usePage } from "@inertiajs/react"
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Organization = {
  id: string
  name: string | null
  slug: string | null
  imageUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
}

type Merchant = {
  id: string
  name: string
  slug: string
  address: string | null
}

type CampaignSummary = {
  id: string
  name: string
  kind: "organization" | "loyalty"
  enrolled: boolean
  url: string
}

type VisitStamp = {
  id: string
  campaignId: string
  campaignName: string
  status: "pending" | "confirmed"
}

type Visit = {
  id: string
  pending: boolean
  code: string | null
  stamps: VisitStamp[]
}

type ProgressLine =
  | { kind: "loyalty"; id: string; name: string; balance: number }
  | { kind: "organization"; id: string; name: string; entries: number; entryPolicy: "simple" | "cumulative" }

type Props = {
  merchant: Merchant
  organization: Organization
  pageState: 2 | 3 | 4 | 5 | 6 | 7
  campaigns: CampaignSummary[]
  visit: Visit | null
  progress: ProgressLine[]
}

const POLL_INTERVAL_MS = 2500

function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`
}

function MerchantHeader({ merchant, organization }: { merchant: Merchant; organization: Organization }) {
  return (
    <header className="flex flex-col gap-1 pt-6" data-testid="merchant-header">
      {organization.name && (
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {organization.name}
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{merchant.name}</h1>
      {merchant.address && (
        <p className="text-sm text-muted-foreground">{merchant.address}</p>
      )}
    </header>
  )
}

function EmptyCampaignsState() {
  return (
    <section
      className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
      data-testid="merchant-empty-state"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
        🤷
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">
        Este estabelecimento ainda não tem campanhas ativas.
      </p>
    </section>
  )
}

function CampaignList({ campaigns, grouped }: { campaigns: CampaignSummary[]; grouped: boolean }) {
  if (!grouped) {
    return (
      <ul
        className="flex flex-col divide-y rounded-lg border bg-card"
        data-testid="merchant-campaign-list"
      >
        {campaigns.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 p-4">
            <span className="font-medium">{c.name}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {c.kind === "loyalty" ? "Fidelidade" : "Campanha"}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  const enrolled = campaigns.filter((c) => c.enrolled)
  const unenrolled = campaigns.filter((c) => !c.enrolled)

  return (
    <div className="flex flex-col gap-4" data-testid="merchant-campaign-groups">
      {enrolled.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="merchant-already-enrolled">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Você já participa
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {enrolled.map((c) => (
              <li key={c.id} className="p-4 text-sm font-medium">{c.name}</li>
            ))}
          </ul>
        </section>
      )}
      {unenrolled.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="merchant-new-enrollment">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Nova inscrição
          </h2>
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {unenrolled.map((c) => (
              <li key={c.id} className="p-4 text-sm font-medium">{c.name}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ClaimButton({ merchantSlug }: { merchantSlug: string }) {
  const { post, processing } = useForm({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post(`/m/${merchantSlug}/visit`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={processing}
        data-testid="merchant-claim-cta"
      >
        Ganhar selo
      </Button>
      <p className="text-xs text-muted-foreground">
        Ao clicar você concorda com os termos de privacidade (LGPD).
      </p>
    </form>
  )
}

const PHONE_DIGITS_RE = /^\d{10,13}$/

function isPlausibleBrazilianPhone(value: string) {
  return PHONE_DIGITS_RE.test(value.replace(/\D/g, ""))
}

function UnidentifiedClaimForm({ merchantSlug }: { merchantSlug: string }) {
  const { data, setData, post, processing, errors } = useForm({
    visit: { name: "", phone: "" },
  })
  const [clientError, setClientError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (data.visit.name.trim().length === 0) {
      setClientError("Informe seu nome.")
      return
    }
    if (!isPlausibleBrazilianPhone(data.visit.phone)) {
      setClientError("Informe um número de WhatsApp válido com DDD.")
      return
    }
    setClientError(null)
    post(`/m/${merchantSlug}/visit`)
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3"
      data-testid="merchant-identify-form"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="merchant-name">Nome</Label>
        <Input
          id="merchant-name"
          name="visit[name]"
          type="text"
          autoComplete="name"
          placeholder="Seu nome"
          value={data.visit.name}
          onChange={(e) => setData("visit", { ...data.visit, name: e.target.value })}
          required
          data-testid="merchant-name-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="merchant-phone">WhatsApp</Label>
        <Input
          id="merchant-phone"
          name="visit[phone]"
          type="tel"
          inputMode="tel"
          placeholder="(53) 99999-1111"
          value={data.visit.phone}
          onChange={(e) => setData("visit", { ...data.visit, phone: e.target.value })}
          required
          data-testid="merchant-phone-input"
        />
        {(clientError || errors.phone || errors.name) && (
          <p className="text-xs text-destructive" data-testid="merchant-phone-error">
            {clientError ?? errors.phone ?? errors.name}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={processing}
        data-testid="merchant-claim-cta"
      >
        Ganhar selo
      </Button>

      <p className="text-xs text-muted-foreground">
        Ao clicar você concorda com os termos de privacidade (LGPD).
      </p>
    </form>
  )
}

function PendingCodeCard({ visit }: { visit: Visit }) {
  return (
    <section
      className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center"
      data-testid="merchant-pending-code"
    >
      <p className="text-sm text-muted-foreground">Mostre este código ao atendente</p>
      <p
        className="font-mono text-5xl font-semibold tracking-[0.3em]"
        data-testid="merchant-pending-code-value"
      >
        {visit.code ? formatCode(visit.code) : "------"}
      </p>
      <ul className="flex w-full flex-col divide-y border-t pt-4 text-left text-sm">
        {visit.stamps.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2">
            <span>{s.campaignName}</span>
            <span className="text-xs text-amber-700">Aguardando…</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ConfirmedCard({ progress }: { progress: ProgressLine[] }) {
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border bg-emerald-50 p-6 text-emerald-900"
      data-testid="merchant-confirmed-card"
    >
      <p className="text-base font-semibold">
        ✓ Você já ganhou seu selo aqui hoje. Volte amanhã!
      </p>
      {progress.length > 0 && (
        <ul className="flex flex-col divide-y divide-emerald-200 border-t border-emerald-200 pt-3 text-sm">
          {progress.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="font-medium">{p.name}</span>
              <span>
                {p.kind === "loyalty"
                  ? `${p.balance} selo${p.balance === 1 ? "" : "s"}`
                  : `${p.entries} entrada${p.entries === 1 ? "" : "s"}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <a
        href="/me"
        className="text-sm font-medium underline underline-offset-4"
        data-testid="merchant-confirmed-me-link"
      >
        Ver minhas inscrições
      </a>
    </section>
  )
}

function usePollWhilePending(pageState: number) {
  useEffect(() => {
    if (pageState !== 6) return
    const id = window.setInterval(() => {
      router.reload({ only: ["visit", "progress", "pageState"] })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [pageState])
}

export default function CustomerMerchantShow({
  merchant,
  organization,
  pageState,
  campaigns,
  visit,
  progress,
}: Props) {
  const page = usePage()
  const currentCustomer = page.props.currentCustomer

  usePollWhilePending(pageState)

  const grouped = useMemo(() => {
    return campaigns.some((c) => !c.enrolled) && campaigns.some((c) => c.enrolled)
  }, [campaigns])

  return (
    <article
      className="flex flex-1 flex-col gap-6 pb-10"
      data-testid={`merchant-page-state-${pageState}`}
    >
      <MerchantHeader merchant={merchant} organization={organization} />

      {pageState === 2 && <EmptyCampaignsState />}

      {pageState === 3 && (
        <section
          className="flex flex-col gap-4"
          data-testid="merchant-unidentified-state"
        >
          <p className="text-sm text-muted-foreground">
            Entre com seu WhatsApp para participar e ganhar seu selo.
          </p>
          <CampaignList campaigns={campaigns} grouped={false} />
          <UnidentifiedClaimForm merchantSlug={merchant.slug} />
        </section>
      )}

      {pageState === 4 && (
        <>
          <section className="flex flex-col gap-2" data-testid="merchant-enrolled-summary">
            <p className="text-sm text-muted-foreground">Você está inscrito em:</p>
            <ul className="flex flex-col divide-y rounded-lg border bg-card">
              {campaigns.map((c) => (
                <li key={c.id} className="p-4 text-sm font-medium">{c.name}</li>
              ))}
            </ul>
          </section>
          {currentCustomer && <ClaimButton merchantSlug={merchant.slug} />}
        </>
      )}

      {pageState === 5 && (
        <>
          <CampaignList campaigns={campaigns} grouped={grouped} />
          {currentCustomer && <ClaimButton merchantSlug={merchant.slug} />}
        </>
      )}

      {pageState === 6 && visit && <PendingCodeCard visit={visit} />}

      {pageState === 7 && <ConfirmedCard progress={progress} />}
    </article>
  )
}

CustomerMerchantShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
