import { Link, router, usePage } from "@inertiajs/react"
import { PencilIcon, PartyPopperIcon } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/celebrate"
import { cn } from "@/lib/utils"
import type { CampaignChrome, RaffleSummary } from "@/types"

type Tab = "lojistas" | "clientes"

type CampaignShowProps = {
  campaign: CampaignChrome
  merchantsCount: number
  enrollmentsCount: number
}

export function CampaignShowLayout({
  activeTab,
  children,
}: {
  activeTab: Tab
  children: ReactNode
}) {
  const { props } = usePage<CampaignShowProps>()
  const { campaign, merchantsCount, enrollmentsCount } = props

  const onActivate = () => {
    router.post(`/organizations/campaigns/${campaign.id}/activation`, {}, { preserveScroll: true })
  }
  const onEnd = () => {
    router.post(`/organizations/campaigns/${campaign.id}/termination`, {}, { preserveScroll: true })
  }
  const onDraw = () => {
    if (!confirm("Sortear os vencedores agora? Esta ação é irreversível.")) return
    router.post(`/organizations/campaigns/${campaign.id}/raffles`, {}, { preserveScroll: true })
  }
  const onDelete = () => {
    if (!confirm("Excluir esta campanha?")) return
    router.delete(`/organizations/campaigns/${campaign.id}`)
  }

  const lojistasHref = `/organizations/campaigns/${campaign.id}`
  const clientesHref = `/organizations/campaigns/${campaign.id}/enrollments`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {campaign.entryPolicy === "cumulative" ? "Acumulativa" : "Simples"}
          {" · "}
          {campaign.startsAt} → {campaign.endsAt}
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "draft" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/organizations/campaigns/${campaign.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Link>
              </Button>
              <Button onClick={onActivate}>Ativar</Button>
              <Button variant="destructive" onClick={onDelete}>
                Excluir
              </Button>
            </>
          )}
          {campaign.status === "active" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/organizations/campaigns/${campaign.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Link>
              </Button>
              <Button variant="destructive" onClick={onEnd}>
                Encerrar
              </Button>
            </>
          )}
          {campaign.status === "ended" && (
            <>
              <span className="text-sm text-muted-foreground">Encerrada</span>
              <Button onClick={onDraw} data-testid="campaign-sortear">
                Sortear
              </Button>
            </>
          )}
          {campaign.status === "drawn" && (
            <span className="text-sm text-muted-foreground">Sorteada</span>
          )}
        </div>
      </div>

      <RafflePanel campaign={campaign} />

      <div className="border-b" data-testid="campaign-tab-bar">
        <nav className="-mb-px flex gap-6 text-sm">
          <TabLink
            href={lojistasHref}
            active={activeTab === "lojistas"}
            testId="campaign-tab-lojistas"
          >
            Lojistas ({merchantsCount})
          </TabLink>
          <TabLink
            href={clientesHref}
            active={activeTab === "clientes"}
            testId="campaign-tab-clientes"
          >
            Clientes ({enrollmentsCount})
          </TabLink>
        </nav>
      </div>

      {children}

      {campaign.entryPolicy === "simple" && campaign.dayCap != null && (
        <p className="text-sm text-muted-foreground">
          Limite: {campaign.dayCap} entrada(s) por dia, por cliente.
        </p>
      )}
    </div>
  )
}

function RafflePanel({ campaign }: { campaign: CampaignChrome }) {
  const panel = campaign.rafflePanel
  const drawn = panel != null && panel.state !== "open"
  const reduced = useReducedMotion()
  const [celebrate, setCelebrate] = useState(false)

  // Fire the loud celebration once, right after the draw — not on every tab switch.
  useEffect(() => {
    if (!drawn || typeof window === "undefined") return
    const key = `fielize:raffle-celebrated:${campaign.id}`
    if (window.sessionStorage.getItem(key)) return
    setCelebrate(true)
    window.sessionStorage.setItem(key, "1")
  }, [campaign.id, drawn])

  if (panel == null) return null
  const isCumulative = campaign.entryPolicy === "cumulative"

  return (
    <section className="relative flex flex-col gap-3" data-testid="raffle-panel">
      {celebrate && <Confetti count={28} />}
      <h2 className="text-lg font-semibold">Sorteio</h2>
      {panel.prizes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum prêmio configurado.</p>
      ) : panel.state === "open" ? (
        <div className="rounded-md border">
          <ul className="divide-y">
            {panel.prizes.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 p-4 text-sm"
                data-testid={`raffle-prize-${p.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{p.name}</span>
                  {isCumulative && p.threshold != null && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {p.threshold} stamps
                    </span>
                  )}
                </div>
                <span
                  className="text-muted-foreground tabular-nums"
                  data-testid={`raffle-pool-size-${p.id}`}
                >
                  {isCumulative ? `${p.poolSize} elegíveis` : `${p.poolSize} entradas`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border">
          <motion.ul
            className="divide-y"
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
          >
            {panel.prizes.map((p) => (
              <motion.li
                key={p.id}
                className="flex items-center justify-between gap-4 p-4 text-sm"
                data-testid={`raffle-prize-${p.id}`}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", stiffness: 320, damping: 26 },
                  },
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{p.name}</span>
                  {isCumulative && p.threshold != null && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {p.threshold} stamps
                    </span>
                  )}
                </div>
                <RaffleWinnerCell
                  campaignId={campaign.id}
                  prizeId={p.id}
                  raffleId={p.raffleId}
                  raffle={p.raffle}
                  celebrate={celebrate}
                />
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}
    </section>
  )
}

function RaffleWinnerCell({
  campaignId,
  prizeId,
  raffleId,
  raffle,
  celebrate = false,
}: {
  campaignId: string
  prizeId: string
  raffleId: string | null
  raffle: RaffleSummary | null
  celebrate?: boolean
}) {
  if (raffle == null) {
    return (
      <span
        className="text-muted-foreground"
        data-testid={`raffle-winner-${prizeId}`}
      >
        —
      </span>
    )
  }

  if (raffle.status === "no_winner") {
    return (
      <span
        className="font-medium text-muted-foreground"
        data-testid={`raffle-no-winner-${prizeId}`}
      >
        Sem vencedor
      </span>
    )
  }

  const drawnAt = new Date(raffle.drawnAt).toLocaleString("pt-BR")
  const onDeliver = () => {
    if (raffleId == null) return
    router.post(
      `/organizations/campaigns/${campaignId}/raffles/${raffleId}/redemption`,
      {},
      { preserveScroll: true },
    )
  }

  return (
    <div
      className="flex flex-col items-end text-right"
      data-testid={`raffle-winner-${prizeId}`}
    >
      <motion.span
        className="mb-1 inline-flex items-center gap-1 rounded-full bg-celebration px-2 py-0.5 text-xs font-semibold text-celebration-foreground"
        initial={celebrate ? { scale: 0.5, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.15 }}
      >
        <PartyPopperIcon className="size-3" />
        Vencedor
      </motion.span>
      <span className="font-medium">{raffle.winner?.displayName}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {raffle.winner?.phoneMasked} · {drawnAt}
      </span>
      {raffle.redemption == null ? (
        <Button
          size="sm"
          className="mt-2"
          onClick={onDeliver}
          data-testid={`raffle-deliver-${prizeId}`}
        >
          Marcar como entregue
        </Button>
      ) : (
        <span
          className="mt-2 text-xs text-muted-foreground"
          data-testid={`raffle-delivered-${prizeId}`}
        >
          Entregue em{" "}
          {new Date(raffle.redemption.redeemedAt).toLocaleDateString("pt-BR")}
          {raffle.redemption.redeemedByName
            ? ` por ${raffle.redemption.redeemedByName}`
            : ""}
        </span>
      )}
    </div>
  )
}

function TabLink({
  href,
  active,
  testId,
  children,
}: {
  href: string
  active: boolean
  testId: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b-2 px-1 py-3 font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  )
}

export function withCampaignShowLayout(activeTab: Tab) {
  return (page: ReactNode) => (
    <AppLayout>
      <CampaignShowLayout activeTab={activeTab}>{page}</CampaignShowLayout>
    </AppLayout>
  )
}
