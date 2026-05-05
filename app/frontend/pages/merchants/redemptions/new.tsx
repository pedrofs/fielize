import { useForm } from "@inertiajs/react"
import { useState, type FormEvent, type ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { MerchantCustomer, RedemptionPreviewPrize } from "@/types"

type Preview = {
  customer: MerchantCustomer
  balance: number
  prizes: RedemptionPreviewPrize[]
}

type Props = {
  phone: string
  preview: Preview | null
}

export default function NewRedemption({ phone, preview }: Props) {
  if (preview) {
    return <PreviewView phone={phone} preview={preview} />
  }
  return <PhoneForm phone={phone} />
}

function PhoneForm({ phone }: { phone: string }) {
  const form = useForm({ phone })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.post("/merchants/redemptions")
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Telefone do cliente
        </label>
        <Input
          id="phone"
          inputMode="tel"
          autoComplete="off"
          autoFocus
          placeholder="+55..."
          value={form.data.phone}
          onChange={(e) => form.setData("phone", e.target.value)}
          required
        />
        {form.errors.base && (
          <p className="text-sm text-destructive">{form.errors.base}</p>
        )}
      </div>
      <Button type="submit" disabled={form.processing}>
        Buscar
      </Button>
    </form>
  )
}

function PreviewView({ phone, preview }: { phone: string; preview: Preview }) {
  const claimable = preview.prizes.find((p) => p.claimable)
  const [selectedId, setSelectedId] = useState<string | null>(claimable?.id ?? null)

  const form = useForm({
    phone,
    loyalty_prize_id: selectedId,
  })

  const onConfirm = (e: FormEvent) => {
    e.preventDefault()
    form.transform((data) => ({ ...data, loyalty_prize_id: selectedId }))
    form.post("/merchants/redemptions")
  }

  return (
    <form onSubmit={onConfirm} className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{preview.customer.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">{preview.customer.phone}</p>
          <p>
            Saldo:{" "}
            <strong>
              {preview.balance} visita{preview.balance === 1 ? "" : "s"}
            </strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prêmios</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {preview.prizes.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="loyalty_prize_id"
                    checked={selectedId === p.id}
                    onChange={() => setSelectedId(p.id)}
                    disabled={!p.claimable}
                  />
                  <span className="flex-1">
                    {p.name}{" "}
                    <span className="text-muted-foreground">
                      ({p.threshold} visita{p.threshold === 1 ? "" : "s"})
                    </span>
                  </span>
                  <span
                    className={
                      p.claimable
                        ? "text-xs font-medium text-emerald-700"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {p.claimable ? "DISPONÍVEL" : `Falta ${p.missing}`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {form.errors.base && (
        <p className="text-sm text-destructive">{form.errors.base}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!selectedId || form.processing}>
          Confirmar resgate
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/merchants/redemptions/new">Cancelar</a>
        </Button>
      </div>
    </form>
  )
}

NewRedemption.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
