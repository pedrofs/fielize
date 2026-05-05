import { useState, type ReactNode, type FormEvent } from "react"
import { Link, router, useForm } from "@inertiajs/react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LoyaltyProgram, LoyaltyPrize } from "@/types"

type Props = {
  loyaltyProgram: LoyaltyProgram
  prizes: LoyaltyPrize[]
}

const STATUS_LABELS: Record<LoyaltyProgram["status"], string> = {
  draft: "Rascunho",
  active: "Ativo",
  ended: "Desativado",
}

export default function LoyaltyProgramShow({ loyaltyProgram, prizes }: Props) {
  const [disableOpen, setDisableOpen] = useState(false)
  const [resetMode, setResetMode] = useState<"keep" | "reset">("keep")

  const enable = () => {
    router.patch("/merchants/loyalty_program", { action_kind: "enable" })
  }

  const disable = (e: FormEvent) => {
    e.preventDefault()
    router.patch(
      "/merchants/loyalty_program",
      { action_kind: "disable", reset: resetMode === "reset" },
      { onSuccess: () => setDisableOpen(false) }
    )
  }

  const removePrize = (prize: LoyaltyPrize) => {
    if (!confirm(`Remover prêmio "${prize.name}"?`)) return
    router.delete(`/merchants/loyalty_program/prizes/${prize.id}`)
  }

  const isDraft = loyaltyProgram.status === "draft"
  const isActive = loyaltyProgram.status === "active"
  const isEnded = loyaltyProgram.status === "ended"

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Programa</CardTitle>
            <p className="text-sm text-muted-foreground">
              Status: <strong>{STATUS_LABELS[loyaltyProgram.status]}</strong>
            </p>
          </div>
          {isDraft && (
            <Button onClick={enable} disabled={prizes.length === 0}>
              Ativar programa
            </Button>
          )}
          {isActive && (
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              Desativar…
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isDraft && prizes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Adicione ao menos 1 prêmio para ativar.
            </p>
          )}
          {isEnded && (
            <p className="text-sm text-muted-foreground">
              Programa desativado. Para reativar, crie um novo programa.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Prêmios</CardTitle>
          {!isEnded && (
            <Button asChild size="sm">
              <Link href="/merchants/loyalty_program/prizes/new">
                <PlusIcon data-icon="inline-start" />
                Adicionar prêmio
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {prizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum prêmio ainda.</p>
          ) : (
            <ul className="divide-y">
              {prizes.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.threshold} visita{p.threshold === 1 ? "" : "s"}
                    </span>
                  </div>
                  {!isEnded && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/merchants/loyalty_program/prizes/${p.id}/edit`}>
                          <PencilIcon />
                          <span className="sr-only">Editar</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePrize(p)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2Icon />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <form onSubmit={disable} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Desativar programa</DialogTitle>
              <DialogDescription>
                Os clientes deixarão de acumular visitas. Escolha o que fazer
                com os saldos atuais.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="reset"
                  checked={resetMode === "keep"}
                  onChange={() => setResetMode("keep")}
                  className="mt-1"
                />
                <span>
                  <strong>Manter saldos atuais</strong> — clientes ainda podem
                  resgatar prêmios já conquistados, mas não acumulam novas
                  visitas.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="reset"
                  checked={resetMode === "reset"}
                  onChange={() => setResetMode("reset")}
                  className="mt-1"
                />
                <span>
                  <strong>Zerar saldos</strong> — todos os saldos voltam a zero
                  imediatamente.
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDisableOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Desativar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

LoyaltyProgramShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
