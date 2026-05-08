import type { ReactNode } from "react"
import { useForm, Link, usePage } from "@inertiajs/react"
import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrixEditor } from "@/components/trix-editor"
import type { SharedProps } from "@/types"

type Props = {
  organization: {
    id: string
    name: string | null
    slug: string | null
    primaryColor: string | null
    secondaryColor: string | null
    bio: string | null
    terms: string | null
    heroImageUrl: string | null
  }
}

export default function OrganizationEdit({ organization }: Props) {
  const { props: pageProps } = usePage<SharedProps>()

  const { data, setData, patch, processing, errors } = useForm<{
    name: string
    slug: string
    primary_color: string
    secondary_color: string
    bio: string
    terms: string
    hero_image: File | null
  }>({
    name: organization.name ?? "",
    slug: organization.slug ?? "",
    primary_color: organization.primaryColor ?? "",
    secondary_color: organization.secondaryColor ?? "",
    bio: organization.bio ?? "",
    terms: organization.terms ?? "",
    hero_image: null,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    patch(`/organizations/${organization.id}`, {
      data: { organization: data },
      forceFormData: true,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar organização
        </h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados e a personalização da página pública.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
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

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <TrixEditor
            id="bio"
            value={data.bio}
            onChange={(html) => setData("bio", html)}
            placeholder="Conte sobre a sua organização…"
          />
          {errors.bio && (
            <p className="text-sm text-destructive">{errors.bio}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Cor primária</Label>
            <Input
              id="primary_color"
              type="color"
              value={data.primary_color || "#000000"}
              onChange={(e) => setData("primary_color", e.target.value)}
              className="h-10 w-full cursor-pointer"
              data-testid="primary-color-input"
            />
            {errors.primary_color && (
              <p className="text-sm text-destructive">{errors.primary_color}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary_color">Cor secundária (opcional)</Label>
            <Input
              id="secondary_color"
              type="color"
              value={data.secondary_color || "#000000"}
              onChange={(e) => setData("secondary_color", e.target.value)}
              className="h-10 w-full cursor-pointer"
              data-testid="secondary-color-input"
            />
            {errors.secondary_color && (
              <p className="text-sm text-destructive">
                {errors.secondary_color}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hero_image">Imagem de capa</Label>
          {organization.heroImageUrl && (
            <img
              src={organization.heroImageUrl}
              alt=""
              className="mb-2 h-32 w-full rounded-md object-cover"
              data-testid="current-hero-image"
            />
          )}
          <Input
            id="hero_image"
            type="file"
            accept="image/*"
            onChange={(e) => setData("hero_image", e.target.files?.[0] ?? null)}
          />
          {errors.hero_image && (
            <p className="text-sm text-destructive">{errors.hero_image}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="terms">Termos</Label>
          <TrixEditor
            id="terms"
            value={data.terms}
            onChange={(html) => setData("terms", html)}
            placeholder="Termos padrão para suas campanhas…"
          />
          {errors.terms && (
            <p className="text-sm text-destructive">{errors.terms}</p>
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
