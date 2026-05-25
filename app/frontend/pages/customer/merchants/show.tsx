import { router, useForm, usePage } from "@inertiajs/react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

import { CalendarOffIcon, CheckIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Confetti, StampThunk, Pressable } from "@/components/celebrate"
import { formatBrazilianPhone, isPlausibleBrazilianPhone } from "@/lib/phone"

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

type ProgressLine = {
  id: string
  name: string
  count: number
  goal: number | null
} & (
  | { kind: "loyalty" }
  | { kind: "organization"; entryPolicy: "simple" | "cumulative" }
)

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
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarOffIcon className="size-8" />
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
      <Pressable className="w-full">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={processing}
          data-testid="merchant-claim-cta"
        >
          Ganhar selo
        </Button>
      </Pressable>
      <p className="text-xs text-muted-foreground">
        Ao clicar você concorda com os termos de privacidade (LGPD).
      </p>
    </form>
  )
}

function UnidentifiedClaimForm({ merchantSlug }: { merchantSlug: string }) {
  const { data, setData, post, processing, errors } = useForm({
    visit: { name: "", phone: "" },
  })
  const [clientErrors, setClientErrors] = useState<{ name?: string; phone?: string }>({})

  // Server (Inertia) errors arrive on flat `name`/`phone` keys; client checks
  // layer on top. Each field renders its own error.
  const nameError = clientErrors.name ?? errors.name
  const phoneError = clientErrors.phone ?? errors.phone

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: { name?: string; phone?: string } = {}
    if (data.visit.name.trim().length === 0) {
      next.name = "Informe seu nome."
    }
    if (!isPlausibleBrazilianPhone(data.visit.phone)) {
      next.phone = "Informe um número de WhatsApp válido com DDD."
    }
    if (next.name || next.phone) {
      setClientErrors(next)
      return
    }
    setClientErrors({})
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
        {nameError && (
          <p className="text-xs text-destructive" data-testid="merchant-name-error">
            {nameError}
          </p>
        )}
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
          onChange={(e) =>
            setData("visit", { ...data.visit, phone: formatBrazilianPhone(e.target.value) })
          }
          required
          data-testid="merchant-phone-input"
        />
        {phoneError && (
          <p className="text-xs text-destructive" data-testid="merchant-phone-error">
            {phoneError}
          </p>
        )}
      </div>

      <Pressable className="w-full">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={processing}
          data-testid="merchant-claim-cta"
        >
          Ganhar selo
        </Button>
      </Pressable>

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
            <span className="text-xs text-warning">Aguardando…</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// The unit noun for a progress line: selos (loyalty), lojas (cumulative
// org-campaign — distinct merchants stamped), or entradas (simple raffle).
function progressUnit(line: ProgressLine): { one: string; many: string } {
  if (line.kind === "loyalty") return { one: "selo", many: "selos" }
  if (line.entryPolicy === "cumulative") return { one: "loja", many: "lojas" }
  return { one: "entrada", many: "entradas" }
}

function plural(n: number, unit: { one: string; many: string }): string {
  return `${n} ${n === 1 ? unit.one : unit.many}`
}

// Reason-to-act copy for a single line. Zero progress gets a forward-looking
// "comece agora" framing; otherwise "X de Y · faltam N" toward the next goal,
// or a plain tally once every prize is already within reach.
function progressPhrase(line: ProgressLine): string {
  const unit = progressUnit(line)

  if (line.count === 0) {
    if (line.kind === "loyalty") {
      return line.goal != null ? `Junte ${plural(line.goal, unit)} pro prêmio` : "Comece a juntar selos"
    }
    if (line.entryPolicy === "cumulative") {
      return line.goal != null ? `Visite ${plural(line.goal, unit)} pro prêmio` : "Comece a visitar lojas"
    }
    return "Garanta sua primeira entrada no sorteio"
  }

  if (line.goal != null) {
    return `${line.count} de ${line.goal} ${unit.many} · faltam ${plural(line.goal - line.count, unit)}`
  }

  if (line.kind === "loyalty") return `${plural(line.count, unit)} · prêmio disponível`
  if (line.entryPolicy === "cumulative") return `${plural(line.count, unit)} · prêmios disponíveis`
  return `${plural(line.count, unit)} no sorteio`
}

function ProgressBar({ count, goal }: { count: number; goal: number }) {
  const pct = Math.min(100, Math.round((count / goal) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-reward/15" aria-hidden>
      <div
        className="h-full rounded-full bg-reward transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// "Progress before action" block for states 4/5: surfaces how close the
// customer already is at this merchant — above the claim CTA — so the reason
// to act is visible first. Zero-progress lines read "Comece agora" instead of
// rendering an empty/discouraging block.
function MerchantProgress({ progress }: { progress: ProgressLine[] }) {
  if (progress.length === 0) return null
  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-reward/30 bg-reward/5 p-4"
      data-testid="merchant-progress"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Seu progresso aqui
      </h2>
      <ul className="flex flex-col gap-4">
        {progress.map((line) => (
          <li key={line.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{line.name}</span>
              {line.count === 0 && (
                <span className="text-xs font-semibold uppercase tracking-wide text-reward">
                  Comece agora
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{progressPhrase(line)}</p>
            {line.goal != null && <ProgressBar count={line.count} goal={line.goal} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProgressList({ progress }: { progress: ProgressLine[] }) {
  if (progress.length === 0) return null
  return (
    <ul className="flex w-full flex-col divide-y divide-reward/30 border-t border-reward/30 pt-3 text-sm">
      {progress.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2">
          <span className="font-medium">{p.name}</span>
          <span className="font-semibold tabular-nums">{plural(p.count, progressUnit(p))}</span>
        </li>
      ))}
    </ul>
  )
}

// State 7: refresh-safe, derived purely from DB state. No confetti — the
// celebration is a transition event (see CelebrationOverlay), never replayed
// from persistent state. The claim CTA is suppressed (one Visit per local_day).
function CalmConfirmedCard({ progress }: { progress: ProgressLine[] }) {
  return (
    <section
      className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center"
      data-testid="merchant-calm-confirmed"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-reward/15 text-reward">
        <CheckIcon className="size-7" strokeWidth={3} />
      </div>
      <p className="text-base font-medium">
        Você já ganhou seu selo hoje · volte amanhã para ganhar mais.
      </p>
      <ProgressList progress={progress} />
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

const CELEBRATION_MS = 2600
const CELEBRATION_REDUCED_MS = 1200

// Keyed to the observed pending→confirmed transition, not to DB state, so a
// refresh can't replay it. Auto-dismisses to reveal the calm landing beneath.
function CelebrationOverlay({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const id = window.setTimeout(onDone, reduced ? CELEBRATION_REDUCED_MS : CELEBRATION_MS)
    return () => window.clearTimeout(id)
  }, [onDone, reduced])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-reward/15 px-6 text-center backdrop-blur-sm"
      data-testid="merchant-celebration"
      role="status"
      aria-live="polite"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Confetti />
      <StampThunk className="size-20" />
      <p className="text-2xl font-semibold">Selo confirmado!</p>
    </motion.div>
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

// Fire the one-shot celebration when the poll loop observes the page move from
// the pending code (6) to the confirmed state (7). A direct load into state 7
// (a refresh after confirmation) initializes `prev` to 7 and never celebrates.
function useStampConfirmedCelebration(pageState: number) {
  const [celebrating, setCelebrating] = useState(false)
  const prev = useRef(pageState)

  useEffect(() => {
    if (prev.current === 6 && pageState === 7) setCelebrating(true)
    prev.current = pageState
  }, [pageState])

  const dismiss = useCallback(() => setCelebrating(false), [])
  return { celebrating, dismiss }
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
  const { celebrating, dismiss } = useStampConfirmedCelebration(pageState)

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
          <MerchantProgress progress={progress} />
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
          <MerchantProgress progress={progress} />
          <CampaignList campaigns={campaigns} grouped={grouped} />
          {currentCustomer && <ClaimButton merchantSlug={merchant.slug} />}
        </>
      )}

      {pageState === 6 && visit && <PendingCodeCard visit={visit} />}

      {pageState === 7 && <CalmConfirmedCard progress={progress} />}

      <AnimatePresence>
        {celebrating && <CelebrationOverlay key="celebration" onDone={dismiss} />}
      </AnimatePresence>
    </article>
  )
}

CustomerMerchantShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)
