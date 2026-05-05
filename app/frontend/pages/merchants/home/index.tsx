import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import { BadgeCheckIcon, GiftIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RecentVisit = {
  id: string
  customerName: string
  createdAt: string
}

type Props = {
  stats: {
    visitsToday: number
    visitsWeek: number
    pendingValidations: number
  }
  recentActivity: RecentVisit[]
}

export default function MerchantHome({ stats, recentActivity }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Visitas hoje" value={stats.visitsToday} />
        <StatCard label="Visitas (7 dias)" value={stats.visitsWeek} />
        <StatCard label="Validações pendentes" value={stats.pendingValidations} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/merchants/validations/new">
            <BadgeCheckIcon data-icon="inline-start" />
            Validar código
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/merchants/redemptions/new">
            <GiftIcon data-icon="inline-start" />
            Resgatar prêmio
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atividade recente.</p>
          ) : (
            <ul className="divide-y">
              {recentActivity.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{v.customerName}</span>
                  <time className="text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString("pt-BR")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

MerchantHome.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
