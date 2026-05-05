import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import type { CampaignStatus } from "@/types"

type MerchantCampaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
  stampsIssuedHere: number
}

type Props = { campaigns: MerchantCampaign[] }

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

function formatRange(startsAt: string | null, endsAt: string | null) {
  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("pt-BR") : "—"
  return `${fmt(startsAt)} – ${fmt(endsAt)}`
}

export default function MerchantCampaigns({ campaigns }: Props) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        Você ainda não participa de nenhuma campanha. O administrador da sua
        CDL pode adicionar sua loja a uma campanha quando ela for criada.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <ul className="divide-y">
        {campaigns.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatRange(c.startsAt, c.endsAt)} · {c.stampsIssuedHere} stamp(s)
                emitidos aqui
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

MerchantCampaigns.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
