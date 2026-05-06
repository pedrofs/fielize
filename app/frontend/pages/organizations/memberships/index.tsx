import type { ReactNode } from "react"
import { usePage, router } from "@inertiajs/react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SharedProps } from "@/types"

type Membership = {
  id: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  role: "owner" | "member"
  merchant: {
    id: string
    name: string
  } | null
}

type Props = {
  memberships: Membership[]
}

export default function MembershipsIndex({ memberships }: Props) {
  const { props: pageProps } = usePage<SharedProps>()
  const currentUser = pageProps.currentUser
  const isOwner = currentUser?.memberships.some(
    (m) =>
      m.organizationId === pageProps.currentOrganization?.id && m.role === "owner"
  )

  const updateRole = (membershipId: string, role: "owner" | "member") => {
    router.patch(
      `/organizations/memberships/${membershipId}`,
      { membership: { role } },
      { preserveScroll: true }
    )
  }

  const removeMember = (membershipId: string) => {
    if (confirm("Remover este membro?")) {
      router.delete(`/organizations/memberships/${membershipId}`, {
        preserveScroll: true,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
      </div>

      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Lojista</TableHead>
              {isOwner && <TableHead className="w-24">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((m) => {
              const isSelf = currentUser?.id === m.user.id
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.user.firstName ?? m.user.email}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    {isOwner && !isSelf ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          updateRole(m.id, v as "owner" | "member")
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Proprietário</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{m.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.merchant?.name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {isOwner && !isSelf && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeMember(m.id)}
                      >
                        Remover
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

MembershipsIndex.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
