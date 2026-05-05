import { useForm } from "@inertiajs/react"
import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LoyaltyPrize } from "@/types"

type Mode = "new" | "edit"

type FormShape = {
  prize: { name: string; threshold: number | null }
}

type Props = {
  mode: Mode
  prize: Pick<LoyaltyPrize, "id" | "name" | "threshold">
}

export function PrizeForm({ mode, prize }: Props) {
  const form = useForm<FormShape>({
    prize: { name: prize.name ?? "", threshold: prize.threshold ?? null },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === "new") {
      form.post("/merchants/loyalty_program/prizes")
    } else {
      form.patch(`/merchants/loyalty_program/prizes/${prize.id}`)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="prize_name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="prize_name"
          value={form.data.prize.name}
          onChange={(e) =>
            form.setData("prize", { ...form.data.prize, name: e.target.value })
          }
          aria-invalid={!!form.errors["prize.name"]}
          required
          autoFocus
        />
        {form.errors["prize.name"] && (
          <p className="text-sm text-destructive">{form.errors["prize.name"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="prize_threshold" className="text-sm font-medium">
          Visitas necessárias
        </label>
        <Input
          id="prize_threshold"
          type="number"
          min={1}
          value={form.data.prize.threshold ?? ""}
          onChange={(e) =>
            form.setData("prize", {
              ...form.data.prize,
              threshold: Number(e.target.value) || null,
            })
          }
          aria-invalid={!!form.errors["prize.threshold"]}
          required
        />
        {form.errors["prize.threshold"] && (
          <p className="text-sm text-destructive">{form.errors["prize.threshold"]}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          {mode === "new" ? "Adicionar prêmio" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/merchants/loyalty_program">Cancelar</a>
        </Button>
      </div>
    </form>
  )
}
