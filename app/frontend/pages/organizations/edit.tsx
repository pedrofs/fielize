import { useState, type ReactNode } from "react"
import { Form, Link, usePage } from "@inertiajs/react"
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

// Errors come back keyed under the "organization." prefix because the
// controller calls `transform_keys { |k| "organization.#{k}" }` on the model
// errors hash. Read flat field names through this helper to keep templates clean.
const fieldError = (
  errors: Record<string, string | string[] | undefined>,
  field: string,
): string | undefined => {
  const value = errors[`organization.${field}`]
  return Array.isArray(value) ? value.join(" ") : value
}

export default function OrganizationEdit({ organization }: Props) {
  const { props: pageProps } = usePage<SharedProps>()
  const [bio, setBio] = useState(organization.bio ?? "")
  const [terms, setTerms] = useState(organization.terms ?? "")

  const isOwner = pageProps.currentUser?.memberships.some(
    (m) => m.organizationId === organization.id && m.role === "owner",
  )

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

      <Form
        method="patch"
        action={`/organizations/${organization.id}`}
        className="space-y-6"
      >
        {({ errors, processing }) => (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="organization[name]"
                defaultValue={organization.name ?? ""}
                autoFocus
              />
              {fieldError(errors, "name") && (
                <p className="text-sm text-destructive">
                  {fieldError(errors, "name")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="organization[slug]"
                defaultValue={organization.slug ?? ""}
              />
              {fieldError(errors, "slug") && (
                <p className="text-sm text-destructive">
                  {fieldError(errors, "slug")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <TrixEditor
                id="bio"
                name="organization[bio]"
                value={bio}
                onChange={setBio}
                placeholder="Conte sobre a sua organização…"
              />
              {fieldError(errors, "bio") && (
                <p className="text-sm text-destructive">
                  {fieldError(errors, "bio")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor primária</Label>
                <Input
                  id="primaryColor"
                  name="organization[primaryColor]"
                  type="color"
                  defaultValue={organization.primaryColor || "#000000"}
                  className="h-10 w-full cursor-pointer"
                  data-testid="primary-color-input"
                />
                {fieldError(errors, "primaryColor") && (
                  <p className="text-sm text-destructive">
                    {fieldError(errors, "primaryColor")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor secundária (opcional)</Label>
                <Input
                  id="secondaryColor"
                  name="organization[secondaryColor]"
                  type="color"
                  defaultValue={organization.secondaryColor || "#000000"}
                  className="h-10 w-full cursor-pointer"
                  data-testid="secondary-color-input"
                />
                {fieldError(errors, "secondaryColor") && (
                  <p className="text-sm text-destructive">
                    {fieldError(errors, "secondaryColor")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroImage">Imagem de capa</Label>
              {organization.heroImageUrl && (
                <img
                  src={organization.heroImageUrl}
                  alt=""
                  className="mb-2 h-32 w-full rounded-md object-cover"
                  data-testid="current-hero-image"
                />
              )}
              <Input
                id="heroImage"
                name="organization[heroImage]"
                type="file"
                accept="image/*"
              />
              {fieldError(errors, "heroImage") && (
                <p className="text-sm text-destructive">
                  {fieldError(errors, "heroImage")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Termos</Label>
              <TrixEditor
                id="terms"
                name="organization[terms]"
                value={terms}
                onChange={setTerms}
                placeholder="Termos padrão para suas campanhas…"
              />
              {fieldError(errors, "terms") && (
                <p className="text-sm text-destructive">
                  {fieldError(errors, "terms")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button type="submit" disabled={processing}>
                  {processing ? "Salvando…" : "Salvar"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Cancelar</Link>
                </Button>
              </div>

              {isOwner && (
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
          </>
        )}
      </Form>
    </div>
  )
}

OrganizationEdit.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
