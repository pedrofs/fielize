import type { ReactNode } from "react"
import { useForm, Link } from "@inertiajs/react"
import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OrganizationNew() {
  const { data, setData, post, processing, errors } = useForm({
    name: "",
    slug: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/organizations", { data: { organization: data } })
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nova organização
        </h1>
        <p className="text-sm text-muted-foreground">
          Crie uma nova organização para gerenciar lojistas e campanhas.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => setData("name", e.target.value)}
            placeholder="CDL Jaguarão"
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
            placeholder="cdl-jaguarao"
          />
          <p className="text-xs text-muted-foreground">
            Gerado automaticamente a partir do nome se deixado em branco.
          </p>
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={processing}>
            Criar
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

OrganizationNew.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
