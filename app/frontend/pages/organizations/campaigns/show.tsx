import type { ReactNode } from "react"
import { Link, router } from "@inertiajs/react"
import { PencilIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CampaignMerchantCombobox } from "@/components/campaign-merchant-combobox"
import { AddAllMerchantsButton } from "@/components/add-all-merchants-button"
import type { Campaign, CampaignMerchantRow, MerchantOption } from "@/types"

type Props = {
  campaign: Campaign
  merchantRows: CampaignMerchantRow[]
  availableMerchants: MerchantOption[]
}

export default function CampaignShow({ campaign, merchantRows, availableMerchants }: Props) {
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

  const joinedDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
  const formatJoinedAt = (iso: string) => joinedDateFormatter.format(new Date(iso))

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
        <div className="flex flex-wrap items-center gap-2">
          <CampaignMerchantCombobox
            campaignId={campaign.id}
            merchants={availableMerchants}
          />
          <AddAllMerchantsButton
            campaignId={campaign.id}
            unattachedCount={availableMerchants.length}
          />
        </div>
        {merchantRows.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="merchants-empty">
            Ainda não há lojistas nesta campanha.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table data-testid="merchants-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Lojista</TableHead>
                  <TableHead className="text-right">Stamps confirmados</TableHead>
                  <TableHead className="text-right">Clientes distintos</TableHead>
                  <TableHead>Entrou em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantRows.map((row) => (
                  <TableRow key={row.merchantId} data-testid={`merchant-row-${row.merchantId}`}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/organizations/merchants/${row.merchantId}`}
                        className="hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.stampsCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.distinctCustomersCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatJoinedAt(row.joinedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
