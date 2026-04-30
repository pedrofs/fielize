import { useForm } from "@inertiajs/react"
import type { FormEvent, ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function NewMerchant() {
  const form = useForm({
    merchant: { name: "" },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.post("/organizations/merchants")
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
          Create merchant
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/organizations/merchants">Cancel</a>
        </Button>
      </div>
    </form>
  )
}

NewMerchant.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
