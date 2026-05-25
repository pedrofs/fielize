import { useState, type ReactNode, type FormEvent } from "react"
import { Link, router, useForm } from "@inertiajs/react"
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CardBody,
  OrgLabel,
  type CardPresentation,
} from "@/components/wallet-card"
import type {
  LoyaltyProgram,
  LoyaltyPrize,
  LoyaltyStandings,
  LoyaltyStandingRow,
} from "@/types"

type Props = {
  loyaltyProgram: LoyaltyProgram
  prizes: LoyaltyPrize[]
  // Draft only: the Card a brand-new Customer sees, rendered with the same
  // CardBody as the customer Wallet. Re-rendered as Prizes are added/removed.
  previewCard?: CardPresentation
  // Active only: the two read-only current-state Customer lists.
  standings?: LoyaltyStandings
}

const STATUS_LABELS: Record<LoyaltyProgram["status"], string> = {
  draft: "Rascunho",
  active: "Ativo",
  ended: "Desativado",
}

export default function LoyaltyProgramShow({
  loyaltyProgram,
  prizes,
  previewCard,
  standings,
}: Props) {
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
          {isEnded && (
            <p className="text-sm text-muted-foreground">
              Programa desativado. Para reativar, crie um novo programa.
            </p>
          )}
        </CardContent>
      </Card>

      {isDraft && previewCard && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia — como seu cliente vê o cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
              data-testid="loyalty-preview-card"
            >
              <header className="flex flex-col gap-1">
                <OrgLabel organization={previewCard.organization} />
                <h3 className="font-semibold leading-tight">
                  {loyaltyProgram.name}
                </h3>
              </header>
              <CardBody card={previewCard} />
            </div>
          </CardContent>
        </Card>
      )}

      {isDraft && (
        <Card data-testid="loyalty-setup">
          <CardHeader>
            <CardTitle>Para colocar no ar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <SetupChecklist hasPrize={prizes.length > 0} isActive={isActive} />
            <div
              className="rounded-lg border bg-muted/40 p-3"
              data-testid="loyalty-worked-example"
            >
              <WorkedExample prizes={prizes} />
            </div>
          </CardContent>
        </Card>
      )}

      {isActive && standings && <Standings standings={standings} />}

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

// The path to "live": ① add a Prize, ② activate. Each step shows its done state
// so a merchant always knows what's left. Rides the existing status/prizes props.
function SetupChecklist({
  hasPrize,
  isActive,
}: {
  hasPrize: boolean
  isActive: boolean
}) {
  const steps = [
    {
      label: "Adicionar prêmio",
      hint: "Crie ao menos um prêmio para seus clientes resgatarem.",
      done: hasPrize,
    },
    {
      label: "Ativar programa",
      hint: "Coloque o cartão no ar para começar a acumular carimbos.",
      done: isActive,
    },
  ]

  return (
    <ol className="flex flex-col gap-3" data-testid="loyalty-setup-checklist">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-start gap-3">
          <span
            data-done={step.done}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              step.done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {step.done ? <CheckIcon className="size-3.5" /> : index + 1}
          </span>
          <div className="flex flex-col">
            <span
              className={cn(
                "text-sm font-medium",
                step.done && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            <span className="text-xs text-muted-foreground">{step.hint}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

// Turns the abstract threshold into a concrete expectation, derived from the
// cheapest Prize (the first reward a Customer reaches). Degrades to a hint when
// there are no Prizes yet — never NaN.
function WorkedExample({ prizes }: { prizes: LoyaltyPrize[] }) {
  if (prizes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Adicione um prêmio para ver um exemplo de como o cartão funciona para o
        seu cliente.
      </p>
    )
  }

  const cheapest = prizes.reduce((lowest, prize) =>
    prize.threshold < lowest.threshold ? prize : lowest,
  )

  return (
    <p className="text-sm">
      A cada{" "}
      <strong>
        {cheapest.threshold} carimbo{cheapest.threshold === 1 ? "" : "s"}
      </strong>
      , seu cliente resgata <strong>{cheapest.name}</strong>.
    </p>
  )
}

// The active program's two read-only actionable lists (ADR-0006: no nudge
// action). "Pode resgatar agora" leads; "Quase lá" follows. When both are empty
// (no Stamps in the era yet) a single calm empty state stands in for both.
function Standings({ standings }: { standings: LoyaltyStandings }) {
  const { redeemable, nearReward, cheapestThreshold } = standings

  if (redeemable.length === 0 && nearReward.length === 0) {
    return (
      <Card data-testid="loyalty-standings-empty">
        <CardHeader>
          <CardTitle>Seus clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ainda sem carimbos — seus clientes começam a participar nas próximas
            visitas.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="loyalty-standings">
      <CardHeader>
        <CardTitle>Pode resgatar agora</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <StandingsList
          rows={redeemable}
          cheapestThreshold={cheapestThreshold}
          variant="redeemable"
          emptyHint="Ninguém com saldo para resgatar agora."
        />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Quase lá</h3>
          <StandingsList
            rows={nearReward}
            cheapestThreshold={cheapestThreshold}
            variant="near"
            emptyHint="Ninguém perto de um prêmio ainda."
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StandingsList({
  rows,
  cheapestThreshold,
  variant,
  emptyHint,
}: {
  rows: LoyaltyStandingRow[]
  cheapestThreshold: number | null
  variant: "redeemable" | "near"
  emptyHint: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>
  }

  return (
    <ul
      className="divide-y"
      data-testid={`loyalty-standings-${variant}`}
    >
      {rows.map((row) => (
        <li
          key={row.customerId}
          className="flex items-center justify-between gap-2 py-2"
        >
          <span className="font-medium">{row.customerName}</span>
          {variant === "redeemable" ? (
            <span className="text-sm font-medium text-primary">
              {row.balance} carimbo{row.balance === 1 ? "" : "s"} · pode resgatar
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {cheapestThreshold !== null && (
                <span className="tabular-nums">
                  {row.balance}/{cheapestThreshold}
                </span>
              )}{" "}
              · faltam {row.missing}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

LoyaltyProgramShow.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
