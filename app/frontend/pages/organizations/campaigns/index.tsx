import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import { PlusIcon, PencilIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import type { CampaignSummary, CampaignStatus } from "@/types"

type Props = {
  campaigns: CampaignSummary[]
  filter: CampaignStatus | null
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  ended: "Encerrada",
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-100 text-slate-600",
}

export default function CampaignsIndex({ campaigns, filter }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <FilterBar current={filter} />
        <Button asChild>
          <Link href="/organizations/campaigns/new">
            <PlusIcon data-icon="inline-start" />
            Nova campanha
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma campanha ainda.
        </div>
      ) : (
        <div className="rounded-md border">
          <ul className="divide-y">
            {campaigns.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/organizations/campaigns/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.entryPolicy === "cumulative" ? "Acumulativa" : "Simples"} ·{" "}
                    {c.merchantsCount} lojista(s) · {c.prizesCount} prêmio(s)
                  </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/organizations/campaigns/${c.id}/edit`}>
                    <PencilIcon />
                    <span className="sr-only">Editar</span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilterBar({ current }: { current: CampaignStatus | null }) {
  const filters: Array<{ key: CampaignStatus | null; label: string }> = [
    { key: null, label: "Todas" },
    { key: "draft", label: "Rascunho" },
    { key: "active", label: "Ativa" },
    { key: "ended", label: "Encerrada" },
  ]

  return (
    <div className="flex items-center gap-2">
      {filters.map((f) => {
        const href = f.key === null
          ? "/organizations/campaigns"
          : `/organizations/campaigns?status=${f.key}`
        const active = current === f.key
        return (
          <Link
            key={f.key ?? "all"}
            href={href}
            className={`text-sm px-3 py-1 rounded-full border ${
              active ? "bg-foreground text-background" : "bg-background"
            }`}
          >
            {f.label}
          </Link>
        )
      })}
    </div>
  )
}

CampaignsIndex.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
