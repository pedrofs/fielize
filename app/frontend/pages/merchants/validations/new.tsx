import { useForm } from "@inertiajs/react"
import { useEffect, useRef, type FormEvent, type ReactNode } from "react"
import { CheckIcon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { CampaignProgressLine, MerchantCustomer } from "@/types"

type Success = {
  customer: MerchantCustomer
  campaignProgress: CampaignProgressLine[]
  validatedCampaignIds: string[]
}

type Props = {
  code: string
  success?: Success
}

export default function NewValidation({ code, success }: Props) {
  const form = useForm({ code })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [success])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.post("/merchants/validations", { preserveState: true })
  }

  if (success) {
    return <SuccessView success={success} />
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium">
          Código de 6 dígitos
        </label>
        <Input
          id="code"
          ref={inputRef}
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="off"
          autoFocus
          className="text-center text-2xl tracking-[0.5em] font-mono"
          value={form.data.code}
          onChange={(e) => form.setData("code", e.target.value.replace(/\D/g, ""))}
          aria-invalid={!!form.errors.code}
          required
        />
        {form.errors.code && (
          <p className="text-sm text-destructive">{form.errors.code}</p>
        )}
      </div>
      <Button type="submit" disabled={form.processing || form.data.code.length !== 6}>
        Validar
      </Button>
    </form>
  )
}

function SuccessView({ success }: { success: Success }) {
  const validated = new Set(success.validatedCampaignIds)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <CheckIcon className="size-5" />
            Validação aprovada
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="font-medium">{success.customer.name}</p>
          <p className="text-sm text-muted-foreground">{success.customer.phone}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {success.campaignProgress.map((line) => {
              const isNewlyConfirmed = validated.has(line.id)
              return (
                <li key={line.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {isNewlyConfirmed && <CheckIcon className="size-4 text-emerald-600" />}
                    <span>{line.name}</span>
                    {!isNewlyConfirmed && (
                      <span className="text-xs text-muted-foreground">(já confirmado)</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {progressLabel(line)}
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Button asChild>
        <a href="/merchants/validations/new">Validar próximo</a>
      </Button>
    </div>
  )
}

function progressLabel(line: CampaignProgressLine): string {
  if (line.kind === "loyalty") {
    return `Saldo: ${line.balance} visita${line.balance === 1 ? "" : "s"}`
  }
  return `${line.entries} entrada${line.entries === 1 ? "" : "s"}`
}

NewValidation.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
