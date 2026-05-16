import { useState } from "react"
import { router } from "@inertiajs/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Props = {
  campaignId: string
  unattachedCount: number
}

export function AddAllMerchantsButton({ campaignId, unattachedCount }: Props) {
  const [open, setOpen] = useState(false)
  const disabled = unattachedCount === 0

  const onConfirm = () => {
    setOpen(false)
    router.post(
      `/organizations/campaigns/${campaignId}/merchants`,
      { bulk: "1" },
      { preserveScroll: true },
    )
  }

  const button = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={() => setOpen(true)}
      data-testid="add-all-merchants-button"
    >
      Adicionar todos
    </Button>
  )

  return (
    <>
      {disabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} data-testid="add-all-merchants-disabled-wrapper">
                {button}
              </span>
            </TooltipTrigger>
            <TooltipContent data-testid="add-all-merchants-tooltip">
              Todos os lojistas já participam.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="add-all-merchants-dialog">
          <DialogHeader>
            <DialogTitle>Adicionar todos os lojistas</DialogTitle>
            <DialogDescription data-testid="add-all-merchants-dialog-body">
              Adicionar {unattachedCount} lojistas à campanha?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} data-testid="add-all-merchants-confirm">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
