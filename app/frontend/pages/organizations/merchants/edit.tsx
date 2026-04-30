import { useForm } from "@inertiajs/react"
import type { FormEvent, ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Merchant = {
  id: number
  name: string
  organizationId: number
}

type Props = {
  merchant: Merchant
}

export default function EditMerchant({ merchant }: Props) {
  const form = useForm({
    merchant: { name: merchant.name },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.patch(`/organizations/merchants/${merchant.id}`)
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="merchant_name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="merchant_name"
          value={form.data.merchant.name}
          onChange={(e) =>
            form.setData("merchant", { name: e.target.value })
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

      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/organizations/merchants">Cancel</a>
        </Button>
      </div>
    </form>
  )
}

EditMerchant.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
