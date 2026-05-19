import { Link, router, usePage } from "@inertiajs/react"
import { PencilIcon } from "lucide-react"
import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CampaignChrome } from "@/types"

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
            <span className="text-sm text-muted-foreground">Encerrada</span>
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
  if (campaign.rafflePanel == null) return null
  const { prizes } = campaign.rafflePanel
  const isCumulative = campaign.entryPolicy === "cumulative"

  return (
    <section className="flex flex-col gap-3" data-testid="raffle-panel">
      <h2 className="text-lg font-semibold">Sorteio</h2>
      {prizes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum prêmio configurado.</p>
      ) : (
        <div className="rounded-md border">
          <ul className="divide-y">
            {prizes.map((p) => (
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
                  {isCumulative
                    ? `${p.poolSize} elegíveis`
                    : `${p.poolSize} entradas`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
