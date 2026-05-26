import { Link, useForm } from "@inertiajs/react"
import type { FormEvent, ReactNode } from "react"
import { PencilIcon, MailPlusIcon, MapPinIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { MerchantMapWidget } from "@/components/merchant-map-widget"
import type { CampaignStatus } from "@/types"

type Merchant = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  organizationId: string
  createdAt: string
}

type Member = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

type LoyaltyCampaign = {
  id: string
  name: string
  status: CampaignStatus
  prizeCount: number
  activeCustomerCount: number
}

type ParticipatingCampaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
}

type Props = {
  merchant: Merchant
  members: Member[]
  loyaltyCampaign: LoyaltyCampaign | null
  participatingCampaigns: ParticipatingCampaign[]
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  ended: "Encerrada",
  drawn: "Sorteada",
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-100 text-slate-600",
  drawn: "bg-indigo-100 text-indigo-700",
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function initials(member: Member): string {
  const f = member.firstName?.[0] ?? ""
  const l = member.lastName?.[0] ?? ""
  return (f + l) || (member.email?.[0]?.toUpperCase() ?? "?")
}

function formatRange(startsAt: string | null, endsAt: string | null) {
  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("pt-BR") : "—"
  return `${fmt(startsAt)} – ${fmt(endsAt)}`
}

export default function MerchantShow({
  merchant,
  members,
  loyaltyCampaign,
  participatingCampaigns,
}: Props) {
  const inviteForm = useForm({ invitation: { email: "" } })

  const onInvite = (e: FormEvent) => {
    e.preventDefault()
    inviteForm.post(`/organizations/merchants/${merchant.id}/invitations`, {
      onSuccess: () => inviteForm.reset("invitation"),
    })
  }

  const lat = merchant.latitude != null ? Number(merchant.latitude) : null
  const lng = merchant.longitude != null ? Number(merchant.longitude) : null
  const hasLocation =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)

  return (
    <div className="flex flex-col gap-6">
      {/* Identity + edit — a slim bar under the merchant name (rendered by the
          layout). The map is demoted to the rail; management content leads. */}
      <div className="flex items-start justify-between gap-4">
        {merchant.address ? (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" />
            {merchant.address}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem endereço cadastrado.
          </p>
        )}
        <Button variant="outline" asChild>
          <Link href={`/organizations/merchants/${merchant.id}/edit`}>
            <PencilIcon data-icon="inline-start" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Primary — what an org user manages about this store. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Programa de fidelidade</h2>
            {loyaltyCampaign ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{loyaltyCampaign.name}</span>
                    <StatusBadge status={loyaltyCampaign.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {loyaltyCampaign.prizeCount} prêmio(s) ·{" "}
                    {loyaltyCampaign.activeCustomerCount} cliente(s) com stamps
                    confirmados
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Este lojista ainda não tem um programa de fidelidade.
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Campanhas da organização</h2>
            {participatingCampaigns.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Este lojista não participa de nenhuma campanha ativa ou
                encerrada.
              </div>
            ) : (
              <div className="rounded-md border">
                <ul className="divide-y">
                  {participatingCampaigns.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/organizations/campaigns/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.name}
                          </Link>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRange(c.startsAt, c.endsAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Rail — reference (where the store is) + config (who can access it). */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Localização</h2>
            {hasLocation ? (
              <MerchantMapWidget latitude={lat} longitude={lng} />
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Endereço ainda não foi geocodificado.
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Equipe</h2>
            <form onSubmit={onInvite} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={inviteForm.data.invitation.email}
                  onChange={(e) =>
                    inviteForm.setData("invitation", { email: e.target.value })
                  }
                  aria-invalid={!!inviteForm.errors["invitation.email"]}
                  required
                />
                {inviteForm.errors["invitation.email"] && (
                  <p className="mt-1 text-sm text-destructive">
                    {inviteForm.errors["invitation.email"]}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={inviteForm.processing}>
                <MailPlusIcon data-icon="inline-start" />
                Convidar
              </Button>
            </form>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum membro ainda.
              </p>
            ) : (
              <div className="rounded-md border">
                <ul className="divide-y">
                  {members.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 p-4">
                      <Avatar className="size-9">
                        <AvatarImage
                          src={member.imageUrl ?? undefined}
                          alt={member.email ?? ""}
                        />
                        <AvatarFallback>{initials(member)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {[member.firstName, member.lastName]
                            .filter(Boolean)
                            .join(" ") || member.email}
                        </span>
                        {member.email && (
                          <span className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

MerchantShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
