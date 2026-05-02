import type { ReactNode } from "react"
import { Link, router } from "@inertiajs/react"
import { PencilIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/types"

type Props = {
  campaign: Campaign
}

export default function CampaignShow({ campaign }: Props) {
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

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Prêmios</h2>
        {campaign.prizes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum prêmio configurado.</p>
        ) : (
          <div className="rounded-md border">
            <ul className="divide-y">
              {campaign.prizes.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-4 text-sm">
                  <span className="font-medium">{p.name}</span>
                  {campaign.entryPolicy === "cumulative" && p.threshold != null && (
                    <span className="text-muted-foreground">{p.threshold} stamps</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Lojistas participantes</h2>
        <p className="text-sm text-muted-foreground">
          {campaign.merchantIds.length} lojista(s) inscritos.
        </p>
      </section>

      {campaign.entryPolicy === "simple" && campaign.dayCap != null && (
        <p className="text-sm text-muted-foreground">
          Limite: {campaign.dayCap} entrada(s) por dia, por cliente.
        </p>
      )}
    </div>
  )
}

CampaignShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
