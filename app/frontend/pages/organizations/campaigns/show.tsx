import { Link, router } from "@inertiajs/react"
import { Trash2Icon } from "lucide-react"

import { withCampaignShowLayout } from "@/layouts/campaign-show-layout"
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
import type { CampaignChrome, CampaignMerchantRow, MerchantOption } from "@/types"

type Props = {
  campaign: CampaignChrome
  merchantRows: CampaignMerchantRow[]
  availableMerchants: MerchantOption[]
}

export default function CampaignShow({ campaign, merchantRows, availableMerchants }: Props) {
  const onRemoveMerchant = (merchantId: string, merchantName: string) => {
    if (!confirm(`Remover ${merchantName} desta campanha?`)) return
    router.delete(
      `/organizations/campaigns/${campaign.id}/merchants/${merchantId}`,
      { preserveScroll: true },
    )
  }
  const canRemoveMerchants = campaign.status === "draft"

  const joinedDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
  const formatJoinedAt = (iso: string) => joinedDateFormatter.format(new Date(iso))

  return (
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
                {canRemoveMerchants && <TableHead className="w-12" />}
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
                  {canRemoveMerchants && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${row.name}`}
                        onClick={() => onRemoveMerchant(row.merchantId, row.name)}
                        data-testid={`merchant-remove-${row.merchantId}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

CampaignShow.layout = withCampaignShowLayout("lojistas")
