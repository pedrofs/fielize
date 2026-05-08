import type { ReactNode } from "react"
import { router } from "@inertiajs/react"

import { AppLayout } from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Window = "days_7" | "days_30" | "all_time"

type PerCampaign = {
  id: string
  name: string
  slug: string
  type: string
  enrollments: number
  stamps: number
  redemptions: number
}

type Metrics = {
  newEnrollments: number
  totalEnrolled: number
  visits: number
  stampsPending: number
  stampsConfirmed: number
  redemptions: number
  perCampaign: PerCampaign[]
}

type Props = {
  window: Window
  metrics: Metrics
}

const WINDOW_LABELS: Record<Window, string> = {
  days_7: "Últimos 7 dias",
  days_30: "Últimos 30 dias",
  all_time: "Desde sempre",
}

export default function OrganizationHome({ window, metrics }: Props) {
  function changeWindow(next: string) {
    router.visit("/", { data: { window: next }, preserveScroll: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="dashboard-window">
          <span>Período</span>
          <select
            id="dashboard-window"
            name="window"
            data-testid="dashboard-window"
            value={window}
            onChange={(e) => changeWindow(e.target.value)}
            className="rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          >
            {(Object.keys(WINDOW_LABELS) as Window[]).map((w) => (
              <option key={w} value={w}>{WINDOW_LABELS[w]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Novos cadastros" value={metrics.newEnrollments} testid="metric-new-enrollments" />
        <StatCard label="Total cadastrado" value={metrics.totalEnrolled} testid="metric-total-enrolled" />
        <StatCard label="Visitas" value={metrics.visits} testid="metric-visits" />
        <StatCard label="Selos pendentes" value={metrics.stampsPending} testid="metric-stamps-pending" />
        <StatCard label="Selos confirmados" value={metrics.stampsConfirmed} testid="metric-stamps-confirmed" />
        <StatCard label="Resgates" value={metrics.redemptions} testid="metric-redemptions" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Campanhas ativas</h2>
        {metrics.perCampaign.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha ativa no momento.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metrics.perCampaign.map((row) => (
              <Card key={row.id} data-testid={`campaign-card-${row.slug}`}>
                <CardHeader>
                  <CardTitle className="text-base">{row.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <CampaignStat label="Cadastros" value={row.enrollments} />
                    <CampaignStat label="Selos" value={row.stamps} />
                    <CampaignStat label="Resgates" value={row.redemptions} />
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, testid }: { label: string; value: number; testid: string }) {
  return (
    <Card data-testid={testid}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function CampaignStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

OrganizationHome.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
