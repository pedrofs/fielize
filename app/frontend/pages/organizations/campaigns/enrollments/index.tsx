import { Link } from "@inertiajs/react"

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
import type { EnrollmentRow, EnrollmentProgress, Pagination, CampaignChrome } from "@/types"

type Props = {
  campaign: CampaignChrome
  enrollmentRows: EnrollmentRow[]
  pagination: Pagination
}

export default function CampaignEnrollmentsIndex({
  campaign,
  enrollmentRows,
  pagination,
}: Props) {
  const consentedDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
  const formatConsentedAt = (iso: string) => consentedDateFormatter.format(new Date(iso))

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Clientes inscritos</h2>

      {enrollmentRows.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="enrollments-empty">
          Ninguém se inscreveu ainda.
        </p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table data-testid="enrollments-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Inscrito em</TableHead>
                  <TableHead className="text-right">Selos</TableHead>
                  <TableHead className="text-right">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollmentRows.map((row) => (
                  <TableRow
                    key={row.customer.id}
                    data-testid={`enrollment-row-${row.customer.id}`}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.customer.displayName}</span>
                        {row.customer.phoneMasked && (
                          <span className="text-xs text-muted-foreground">
                            {row.customer.phoneMasked}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatConsentedAt(row.consentedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.stampsCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <ProgressCell progress={row.progress} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationBar campaignId={campaign.id} pagination={pagination} />
        </>
      )}
    </section>
  )
}

function ProgressCell({ progress }: { progress: EnrollmentProgress }) {
  if (progress.kind === "cumulative") {
    if (progress.nextPrizeThreshold == null) {
      return <span>{progress.merchantsStamped} / —</span>
    }
    return (
      <span>
        {progress.merchantsStamped} / {progress.nextPrizeThreshold}
      </span>
    )
  }
  return <span>{progress.entries}</span>
}

function PaginationBar({
  campaignId,
  pagination,
}: {
  campaignId: string
  pagination: Pagination
}) {
  if (pagination.pages <= 1) return null

  const baseUrl = `/organizations/campaigns/${campaignId}/enrollments`

  return (
    <div
      className="flex items-center justify-between text-sm"
      data-testid="enrollments-pagination"
    >
      <span className="text-muted-foreground">
        Página {pagination.page} de {pagination.pages} · {pagination.count} cliente(s)
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild={pagination.prev != null}
          disabled={pagination.prev == null}
          data-testid="enrollments-pagination-prev"
        >
          {pagination.prev != null ? (
            <Link href={`${baseUrl}?page=${pagination.prev}`}>Anterior</Link>
          ) : (
            <span>Anterior</span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild={pagination.next != null}
          disabled={pagination.next == null}
          data-testid="enrollments-pagination-next"
        >
          {pagination.next != null ? (
            <Link href={`${baseUrl}?page=${pagination.next}`}>Próxima</Link>
          ) : (
            <span>Próxima</span>
          )}
        </Button>
      </div>
    </div>
  )
}

CampaignEnrollmentsIndex.layout = withCampaignShowLayout("clientes")
