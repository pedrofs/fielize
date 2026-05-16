import { useMemo, useState } from "react"
import { router } from "@inertiajs/react"
import { ChevronsUpDownIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { MerchantOption } from "@/types"

type Props = {
  campaignId: string
  merchants: MerchantOption[]
}

export function CampaignMerchantCombobox({ campaignId, merchants }: Props) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return merchants
    return merchants.filter((m) => m.name.toLowerCase().includes(needle))
  }, [filter, merchants])

  const onSelect = (merchantId: string) => {
    setOpen(false)
    setFilter("")
    router.post(
      `/organizations/campaigns/${campaignId}/merchants`,
      { merchant_id: merchantId },
      { preserveScroll: true },
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={merchants.length === 0}
          className="w-72 justify-between"
          data-testid="campaign-merchant-combobox"
        >
          <span className="text-muted-foreground">
            {merchants.length === 0
              ? "Todos os lojistas já estão na campanha"
              : "Adicionar lojista…"}
          </span>
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar lojista…"
            className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
            data-testid="campaign-merchant-combobox-input"
          />
        </div>
        <ul
          role="listbox"
          className="max-h-64 overflow-y-auto py-1"
          data-testid="campaign-merchant-combobox-list"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum lojista encontrado.
            </li>
          ) : (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className={cn(
                    "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  )}
                  data-testid={`campaign-merchant-combobox-option-${m.id}`}
                >
                  {m.name}
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
