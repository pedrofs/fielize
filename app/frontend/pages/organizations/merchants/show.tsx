import { Link, useForm } from "@inertiajs/react"
import type { FormEvent, ReactNode } from "react"
import { PencilIcon, MailPlusIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

type Merchant = {
  id: number
  name: string
  organizationId: number
}

type Member = {
  id: number
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

type Props = {
  merchant: Merchant
  members: Member[]
}

function initials(member: Member): string {
  const f = member.firstName?.[0] ?? ""
  const l = member.lastName?.[0] ?? ""
  return (f + l) || (member.email?.[0]?.toUpperCase() ?? "?")
}

export default function MerchantShow({ merchant, members }: Props) {
  const inviteForm = useForm({ invitation: { email: "" } })

  const onInvite = (e: FormEvent) => {
    e.preventDefault()
    inviteForm.post(`/organizations/merchants/${merchant.id}/invitations`, {
      onSuccess: () => inviteForm.reset("invitation"),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-end">
        <Button variant="outline" asChild>
          <Link href={`/organizations/merchants/${merchant.id}/edit`}>
            <PencilIcon data-icon="inline-start" />
            Editar
          </Link>
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Convidar usuário</h2>
        <form onSubmit={onInvite} className="flex max-w-lg items-start gap-2">
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
        <p className="text-xs text-muted-foreground">
          Envia um e-mail de convite. O usuário será adicionado a este lojista
          após se cadastrar.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Membros</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
        ) : (
          <div className="rounded-md border">
            <ul className="divide-y">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 p-4"
                >
                  <Avatar className="size-9">
                    <AvatarImage
                      src={member.imageUrl ?? undefined}
                      alt={member.email ?? ""}
                    />
                    <AvatarFallback>{initials(member)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {[member.firstName, member.lastName]
                        .filter(Boolean)
                        .join(" ") || member.email}
                    </span>
                    {member.email && (
                      <span className="text-xs text-muted-foreground">
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
  )
}

MerchantShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
