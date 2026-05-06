import type { ReactNode } from "react"
import { useForm, Link, usePage } from "@inertiajs/react"
import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SharedProps } from "@/types"

type Props = {
  organization: {
    id: string
    name: string | null
    slug: string | null
  }
}

export default function OrganizationEdit({ organization }: Props) {
  const { props: pageProps } = usePage<SharedProps>()

  const { data, setData, patch, processing, errors } = useForm({
    name: organization.name ?? "",
    slug: organization.slug ?? "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    patch(`/organizations/${organization.id}`, {
      data: { organization: data },
    })
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar organização
        </h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados da organização.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => setData("name", e.target.value)}
            autoFocus
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={data.slug}
            onChange={(e) => setData("slug", e.target.value)}
          />
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug}</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button type="submit" disabled={processing}>
              Salvar
            </Button>
            <Button variant="outline" asChild>
              <Link href="/organizations/merchants">Cancelar</Link>
            </Button>
          </div>

          {pageProps.currentUser?.memberships.some(
            (m) =>
              m.organizationId === organization.id && m.role === "owner"
          ) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-destructive mb-2">
                Zona de perigo
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Exclusão de organização ainda não implementada.
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

OrganizationEdit.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
