import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CalendarRangeIcon,
  ClockIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { CampaignStatus, EntryPolicy } from "@/types"

type Prize = {
  id: string
  name: string
  threshold: number | null
  position: number
}

type RaffleRow = {
  prizeId: string
  prizeName: string
  position: number
  winnerDisplayName: string | null
  winnerPhoneMasked: string | null
  drawnAt: string | null
  status: "drawn" | "no_winner" | null
}

type LeaderRow = {
  merchantId: string
  name: string
  stamps: number
  customers: number
  rank: number
  isCurrent: boolean
}

type ActivityRow = {
  id: string
  customerDisplayName: string
  confirmedAt: string
}

type Standing = {
  stampsConfirmed: number
  distinctCustomers: number
  pendingValidations: number
  rankByStamps: number | null
  rankByCustomers: number | null
  totalMerchants: number
  sharePercentOfStamps: number
  totalCampaignStamps: number
  totalCampaignCustomers: number
}

type CampaignChrome = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  entryPolicy: EntryPolicy
  startsAt: string | null
  endsAt: string | null
  dayCap: number | null
  organizationName: string
  organizationLandingPath: string | null
  prizes: Prize[]
  raffles: RaffleRow[]
}

type Props = {
  campaign: CampaignChrome
  merchant: { id: string; name: string; joinedAt: string }
  standing: Standing
  leaderboard: LeaderRow[]
  recentActivity: ActivityRow[]
}

const STATUS_COPY: Record<CampaignStatus, { label: string; tone: string; dot: string }> = {
  draft: {
    label: "Em rascunho",
    tone: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground/60",
  },
  active: {
    label: "Ativa",
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  ended: {
    label: "Encerrada",
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
  drawn: {
    label: "Sorteada",
    tone: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-600",
  },
}

const ENTRY_POLICY_TAGLINE: Record<EntryPolicy, string> = {
  cumulative:
    "Cada cliente ganha mais chances no sorteio quanto mais lojistas diferentes ela visita.",
  simple:
    "Cada stamp confirmado vira uma entrada no sorteio do fim da campanha.",
}

const numberFmt = new Intl.NumberFormat("pt-BR")
const percentFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const longDateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})
const shortDateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
})
const dayMonthFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" })

function formatNumber(n: number) {
  return numberFmt.format(n)
}

function formatPercent(n: number) {
  return `${percentFmt.format(n)}%`
}

function formatRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return "—"
  return `${shortDateFmt.format(new Date(startsAt))} – ${shortDateFmt.format(new Date(endsAt))}`
}

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function timelineCopy(status: CampaignStatus, startsAt: string | null, endsAt: string | null) {
  const now = new Date()
  if (status === "draft" && startsAt) {
    const d = daysBetween(now, new Date(startsAt))
    if (d > 1) return `Começa em ${d} dias`
    if (d === 1) return "Começa amanhã"
    if (d === 0) return "Começa hoje"
    return `Começa em ${dayMonthFmt.format(new Date(startsAt))}`
  }
  if (status === "active" && endsAt) {
    const d = daysBetween(now, new Date(endsAt))
    if (d > 1) return `Termina em ${d} dias`
    if (d === 1) return "Termina amanhã"
    if (d === 0) return "Termina hoje"
    return "Termina em breve"
  }
  if ((status === "ended" || status === "drawn") && endsAt) {
    const d = daysBetween(new Date(endsAt), now)
    if (status === "drawn") return "Sorteio realizado"
    if (d <= 0) return "Encerrada hoje"
    if (d === 1) return "Encerrou ontem"
    return `Encerrou há ${d} dias`
  }
  return null
}

function formatRelativeFromNow(iso: string) {
  const then = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "agora há pouco"
  if (min < 60) return `há ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `há ${hr} h`
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (then.getTime() >= startOfToday.getTime() - 24 * 60 * 60 * 1000) return "ontem"
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 7) return `há ${days} dias`
  return shortDateFmt.format(then)
}

function rankLabel(rank: number | null, total: number) {
  if (!rank || total === 0) return { hero: "—", tail: "sem dados ainda" }
  return { hero: rank.toString().padStart(2, "0"), tail: `de ${total} lojistas` }
}

export default function MerchantCampaignShow({
  campaign,
  merchant,
  standing,
  leaderboard,
  recentActivity,
}: Props) {
  const status = STATUS_COPY[campaign.status]
  const timeline = timelineCopy(campaign.status, campaign.startsAt, campaign.endsAt)
  const isDraft = campaign.status === "draft"
  const isDrawn = campaign.status === "drawn"
  const hasPending = standing.pendingValidations > 0
  const stampsRank = rankLabel(standing.rankByStamps, standing.totalMerchants)
  const customersRank = rankLabel(standing.rankByCustomers, standing.totalMerchants)

  return (
    <div className="-mt-2 flex flex-col gap-12 pb-12">
      {/* Meta strip — status + dates + landing page link */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            status.tone,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden />
          {status.label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CalendarRangeIcon className="size-3.5" aria-hidden />
          {formatRange(campaign.startsAt, campaign.endsAt)}
        </span>
        {timeline && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ClockIcon className="size-3.5" aria-hidden />
            {timeline}
          </span>
        )}
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
          {campaign.entryPolicy === "cumulative" ? "Cumulativo" : "Simples"}
        </span>
        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Promovida por <span className="font-medium text-foreground">{campaign.organizationName}</span>
          </span>
          {campaign.organizationLandingPath && (
            <Button asChild variant="ghost" size="xs">
              <Link href={campaign.organizationLandingPath}>
                Página pública
                <ArrowUpRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* CHAPTER 01 — POSIÇÃO */}
      <section
        aria-labelledby="ch-standing"
        className="animate-in fade-in slide-in-from-bottom-2 duration-700"
      >
        <ChapterHeader id="ch-standing" number="01" title="Posição" />

        {isDraft ? (
          <DraftBanner startsAt={campaign.startsAt} />
        ) : (
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-12">
            {/* Rank — the visual hero */}
            <div className="md:col-span-5">
              <Eyebrow>Sua loja é a</Eyebrow>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-light tabular-nums leading-none text-foreground text-[5.5rem] md:text-[7rem] tracking-[-0.04em]">
                  {stampsRank.hero}
                </span>
                <span className="text-2xl font-light tabular-nums text-muted-foreground/70">
                  / {standing.totalMerchants.toString().padStart(2, "0")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-amber-500" aria-hidden />
                  <span className="font-medium text-foreground">{merchant.name}</span>
                </span>
                <span className="mx-2 text-border">·</span>
                ranking por stamps confirmados
              </p>
            </div>

            {/* Three stats: stamps, customers, share */}
            <div className="md:col-span-7 grid grid-cols-3 gap-x-6">
              <BigStat
                label="Stamps confirmados"
                value={formatNumber(standing.stampsConfirmed)}
                footnote={`#${stampsRank.hero} de ${standing.totalMerchants}`}
              />
              <BigStat
                label="Clientes únicos"
                value={formatNumber(standing.distinctCustomers)}
                footnote={`#${customersRank.hero} de ${standing.totalMerchants}`}
                emphasis={campaign.entryPolicy === "cumulative"}
              />
              <BigStat
                label="Share dos stamps"
                value={formatPercent(standing.sharePercentOfStamps)}
                footnote={`de ${formatNumber(standing.totalCampaignStamps)} no total`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Pending validations — only when there's work to do */}
      {hasPending && (
        <aside
          className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:80ms] fill-mode-backwards relative overflow-hidden rounded-lg border border-amber-200 bg-amber-50/60 ring-1 ring-inset ring-amber-200/60"
          aria-label="Validações pendentes"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" aria-hidden />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-amber-500/10 text-amber-700">
                <BadgeCheckIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-amber-950">
                  {standing.pendingValidations}{" "}
                  {standing.pendingValidations === 1
                    ? "stamp aguarda sua validação"
                    : "stamps aguardam sua validação"}
                </p>
                <p className="text-xs text-amber-900/70">
                  Cliente já mostrou o código no caixa — confirme para contar pra campanha.
                </p>
              </div>
            </div>
            <Button asChild className="ms-auto bg-amber-600 text-white hover:bg-amber-700">
              <Link href="/merchants/validations/new">
                Validar agora
                <ArrowUpRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </aside>
      )}

      {/* CHAPTER 02/03 — CAMPANHA + RANKING (asymmetric two-column) */}
      <div className="grid gap-12 lg:grid-cols-12">
        <section
          aria-labelledby="ch-campaign"
          className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:120ms] fill-mode-backwards lg:col-span-5"
        >
          <ChapterHeader id="ch-campaign" number="02" title="Campanha" />

          <div className="space-y-6">
            <div>
              <h3 className="font-heading text-2xl font-medium tracking-tight">{campaign.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {ENTRY_POLICY_TAGLINE[campaign.entryPolicy]}
                {campaign.entryPolicy === "simple" && campaign.dayCap && (
                  <>
                    {" "}Limite de <span className="font-medium text-foreground">{campaign.dayCap}</span>{" "}
                    entrada{campaign.dayCap > 1 ? "s" : ""} por cliente por dia.
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border bg-muted/30 px-5 py-4 text-sm">
              <MetaRow label="Início" value={campaign.startsAt ? longDateFmt.format(new Date(campaign.startsAt)) : "—"} />
              <MetaRow label="Fim" value={campaign.endsAt ? longDateFmt.format(new Date(campaign.endsAt)) : "—"} />
              <MetaRow
                label="Você entrou"
                value={longDateFmt.format(new Date(merchant.joinedAt))}
              />
              <MetaRow label="Lojistas" value={`${formatNumber(standing.totalMerchants)}`} />
            </div>

            {campaign.prizes.length > 0 && (
              <div>
                <Eyebrow as="h4">
                  <span className="inline-flex items-center gap-1.5">
                    <GiftIcon className="size-3" aria-hidden /> Prêmios
                  </span>
                </Eyebrow>
                <ol className="mt-3 divide-y divide-border/70 border-y border-border/70">
                  {campaign.prizes.map((prize) => (
                    <li
                      key={prize.id}
                      className="flex items-center justify-between gap-4 py-2.5 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground/80">
                          {prize.position.toString().padStart(2, "0")}
                        </span>
                        <span className="truncate font-medium">{prize.name}</span>
                      </div>
                      <PrizeRule policy={campaign.entryPolicy} threshold={prize.threshold} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="ch-ranking"
          className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:160ms] fill-mode-backwards lg:col-span-7"
        >
          <ChapterHeader id="ch-ranking" number="03" title="Ranking" />

          {isDraft || leaderboard.length === 0 ? (
            <EmptyState>
              {isDraft
                ? "A campanha ainda não começou — quando os primeiros stamps aparecerem, o ranking começa aqui."
                : "Sem stamps confirmados ainda. O ranking aparece assim que a primeira loja pontuar."}
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-x-4 border-b bg-muted/40 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span>#</span>
                <span>Lojista</span>
                <span className="text-right">Stamps</span>
                <span className="text-right tabular-nums">Clientes</span>
              </div>
              <ol>
                {leaderboard.map((row, i) => {
                  const showGap =
                    i > 0 && leaderboard[i - 1].rank + 1 !== row.rank
                  return (
                    <li key={row.merchantId}>
                      {showGap && (
                        <div
                          className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-x-4 border-y border-dashed border-border/60 px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60"
                          aria-hidden
                        >
                          <span>·</span>
                          <span>…</span>
                          <span />
                          <span />
                        </div>
                      )}
                      <div
                        className={cn(
                          "relative grid grid-cols-[3rem_1fr_auto_auto] items-center gap-x-4 px-4 py-3 text-sm transition-colors",
                          row.isCurrent
                            ? "bg-amber-50/70"
                            : "hover:bg-muted/40",
                        )}
                      >
                        {row.isCurrent && (
                          <span
                            className="absolute inset-y-0 left-0 w-[3px] bg-amber-500"
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            row.isCurrent
                              ? "text-amber-700 font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.rank.toString().padStart(2, "0")}
                        </span>
                        <span className={cn("truncate", row.isCurrent && "font-medium")}>
                          {row.isCurrent ? (
                            <span className="inline-flex items-center gap-1.5">
                              {row.name}
                              <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
                                sua loja
                              </span>
                            </span>
                          ) : (
                            row.name
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-right tabular-nums",
                            row.isCurrent && "font-semibold",
                          )}
                        >
                          {formatNumber(row.stamps)}
                        </span>
                        <span className="text-right tabular-nums text-muted-foreground">
                          {formatNumber(row.customers)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
                Total da campanha:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatNumber(standing.totalCampaignStamps)} stamps
                </span>
                <span className="mx-2 text-border">·</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatNumber(standing.totalCampaignCustomers)} clientes únicos
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* CHAPTER 04 — ATIVIDADE NA SUA LOJA */}
      <section
        aria-labelledby="ch-activity"
        className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:200ms] fill-mode-backwards"
      >
        <ChapterHeader
          id="ch-activity"
          number="04"
          title="Atividade na sua loja"
        />

        {recentActivity.length === 0 ? (
          <EmptyState>
            Nenhum stamp confirmado aqui ainda nesta campanha. Quando um cliente
            escanear seu QR e o stamp for validado, aparece nesta coluna.
          </EmptyState>
        ) : (
          <ol className="divide-y divide-border/70 border-y border-border/70">
            {recentActivity.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-4 py-3 text-sm"
              >
                <time
                  dateTime={row.confirmedAt}
                  className="text-xs uppercase tracking-[0.12em] text-muted-foreground tabular-nums"
                >
                  {formatRelativeFromNow(row.confirmedAt)}
                </time>
                <span className="truncate">{row.customerDisplayName}</span>
                <span className="font-mono text-xs text-emerald-700">+1 stamp</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* CHAPTER 05 — SORTEIO (only when drawn) — ceremonial */}
      {isDrawn && campaign.raffles.length > 0 && (
        <section
          aria-labelledby="ch-raffle"
          className="animate-in fade-in slide-in-from-bottom-2 duration-700 [animation-delay:240ms] fill-mode-backwards"
        >
          <ChapterHeader
            id="ch-raffle"
            number="05"
            title="Sorteio"
            icon={<TrophyIcon className="size-3" aria-hidden />}
          />

          <ol className="grid gap-3 sm:grid-cols-2">
            {campaign.raffles
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((raffle) => (
                <li
                  key={raffle.prizeId}
                  className="flex flex-col gap-2 rounded-lg border bg-card px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] tabular-nums uppercase tracking-[0.18em] text-muted-foreground">
                      Prêmio {raffle.position.toString().padStart(2, "0")}
                    </span>
                    {raffle.drawnAt && (
                      <time
                        dateTime={raffle.drawnAt}
                        className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        {shortDateFmt.format(new Date(raffle.drawnAt))}
                      </time>
                    )}
                  </div>
                  <p className="font-medium">{raffle.prizeName}</p>
                  {raffle.status === "no_winner" ? (
                    <p className="text-sm text-muted-foreground">
                      Sem ganhadores — pool vazio no momento do sorteio.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <SparklesIcon className="size-3.5 text-amber-600" aria-hidden />
                      <span className="font-medium">{raffle.winnerDisplayName}</span>
                      {raffle.winnerPhoneMasked && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {raffle.winnerPhoneMasked}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Os prêmios são entregues pela organização. Sua loja não precisa de
            nenhuma ação aqui.
          </p>
        </section>
      )}
    </div>
  )
}

/* — Sub-components — */

function ChapterHeader({
  id,
  number,
  title,
  icon,
}: {
  id: string
  number: string
  title: string
  icon?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-baseline gap-4">
      <span className="font-mono text-xs tabular-nums uppercase tracking-[0.22em] text-muted-foreground/70">
        {number}
      </span>
      <Separator className="hidden h-px flex-1 sm:block" />
      <h2
        id={id}
        className="font-heading text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-1.5"
      >
        {icon}
        {title}
      </h2>
    </div>
  )
}

function Eyebrow({
  as: Comp = "p",
  children,
  className,
}: {
  as?: "p" | "h4" | "span"
  children: ReactNode
  className?: string
}) {
  return (
    <Comp
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </Comp>
  )
}

function BigStat({
  label,
  value,
  footnote,
  emphasis = false,
}: {
  label: string
  value: string
  footnote?: string
  emphasis?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border/70 pt-3">
      <Eyebrow>{label}</Eyebrow>
      <div
        className={cn(
          "font-light tabular-nums leading-none tracking-[-0.03em]",
          "text-3xl md:text-[2.75rem]",
          emphasis && "text-foreground",
        )}
      >
        {value}
      </div>
      {footnote && (
        <p className="text-xs text-muted-foreground tabular-nums">{footnote}</p>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function PrizeRule({
  policy,
  threshold,
}: {
  policy: EntryPolicy
  threshold: number | null
}) {
  if (policy === "cumulative") {
    return (
      <span className="text-xs text-muted-foreground">
        a partir de{" "}
        <span className="font-medium tabular-nums text-foreground">
          {threshold ?? "—"}
        </span>{" "}
        lojistas
      </span>
    )
  }
  return (
    <span className="text-xs text-muted-foreground">sorteio simples</span>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function DraftBanner({ startsAt }: { startsAt: string | null }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Eyebrow>Em rascunho</Eyebrow>
      <p className="mt-3 text-base">
        A campanha ainda não começou
        {startsAt && (
          <>
            {" "}— prevista para{" "}
            <span className="font-medium">
              {longDateFmt.format(new Date(startsAt))}
            </span>
          </>
        )}
        .
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Sua posição, contribuição e ranking aparecem aqui assim que os primeiros
        clientes começarem a acumular stamps.
      </p>
    </div>
  )
}

MerchantCampaignShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
