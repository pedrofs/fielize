import { useForm } from "@inertiajs/react"
import type { FormEvent, ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Merchant = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  organizationId: string
}

type Props = {
  merchant: Merchant
}

export default function EditMerchant({ merchant }: Props) {
  const form = useForm({
    merchant: {
      name: merchant.name,
      address: merchant.address ?? "",
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.patch(`/organizations/merchants/${merchant.id}`)
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="merchant_name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="merchant_name"
          value={form.data.merchant.name}
          onChange={(e) =>
            form.setData("merchant", { ...form.data.merchant, name: e.target.value })
          }
          aria-invalid={!!form.errors["merchant.name"]}
          required
          autoFocus
        />
        {form.errors["merchant.name"] && (
          <p className="text-sm text-destructive">
            {form.errors["merchant.name"]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="merchant_address" className="text-sm font-medium">
          Endereço
        </label>
        <Input
          id="merchant_address"
          value={form.data.merchant.address}
          onChange={(e) =>
            form.setData("merchant", { ...form.data.merchant, address: e.target.value })
          }
          aria-invalid={!!form.errors["merchant.address"]}
          placeholder="Rua, número, bairro, cidade"
        />
        {form.errors["merchant.address"] && (
          <p className="text-sm text-destructive">
            {form.errors["merchant.address"]}
          </p>
        )}
        {merchant.latitude && merchant.longitude && (
          <p className="text-xs text-muted-foreground">
            Coordenadas: {merchant.latitude.toFixed(4)}, {merchant.longitude.toFixed(4)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          Salvar alterações
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/organizations/merchants">Cancelar</a>
        </Button>
      </div>
    </form>
  )
}

EditMerchant.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
