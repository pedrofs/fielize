import { useForm } from "@inertiajs/react"
import type { FormEvent } from "react"
import { TrashIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Campaign, EntryPolicy, MerchantOption, PrizeInput } from "@/types"

type Mode = "new" | "edit"

type Props = {
  mode: Mode
  campaign: Campaign
  merchants: MerchantOption[]
}

type FormShape = {
  campaign: {
    name: string
    slug: string
    startsAt: string
    endsAt: string
    entryPolicy: EntryPolicy
    requiresValidation: boolean
    dayCap: number | null
    merchantIds: string[]
    prizesAttributes: PrizeInput[]
  }
}

export function CampaignForm({ mode, campaign, merchants }: Props) {
  const form = useForm<FormShape>({
    campaign: {
      name: campaign.name,
      slug: campaign.slug,
      startsAt: campaign.startsAt ?? "",
      endsAt: campaign.endsAt ?? "",
      entryPolicy: campaign.entryPolicy,
      requiresValidation: campaign.requiresValidation,
      dayCap: campaign.dayCap,
      merchantIds: campaign.merchantIds,
      prizesAttributes: campaign.prizes.map((p) => ({
        id: p.id,
        name: p.name,
        threshold: p.threshold,
        position: p.position,
      })),
    },
  })

  const isActive = campaign.status === "active"

  const update = <K extends keyof FormShape["campaign"]>(
    key: K,
    value: FormShape["campaign"][K]
  ) => {
    form.setData("campaign", { ...form.data.campaign, [key]: value })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === "new") {
      form.post("/organizations/campaigns")
    } else {
      form.patch(`/organizations/campaigns/${campaign.id}`)
    }
  }

  const addPrize = () => {
    const next = [...form.data.campaign.prizesAttributes, {
      name: "",
      threshold: form.data.campaign.entryPolicy === "cumulative" ? 0 : null,
      position: form.data.campaign.prizesAttributes.length,
    }]
    update("prizesAttributes", next)
  }

  const updatePrize = (index: number, patch: Partial<PrizeInput>) => {
    const next = form.data.campaign.prizesAttributes.map((p, i) =>
      i === index ? { ...p, ...patch } : p
    )
    update("prizesAttributes", next)
  }

  const removePrize = (index: number) => {
    const target = form.data.campaign.prizesAttributes[index]
    if (target.id) {
      // existing row → mark for destruction
      updatePrize(index, { _destroy: true })
    } else {
      // unsaved row → splice
      const next = form.data.campaign.prizesAttributes.filter((_, i) => i !== index)
      update("prizesAttributes", next)
    }
  }

  const onPolicyChange = (policy: EntryPolicy) => {
    const prizes = policy === "simple"
      ? form.data.campaign.prizesAttributes.map((p) => ({ ...p, threshold: null }))
      : form.data.campaign.prizesAttributes
    form.setData("campaign", {
      ...form.data.campaign,
      entryPolicy: policy,
      prizesAttributes: prizes,
    })
  }

  const toggleMerchant = (merchantId: string, checked: boolean) => {
    const current = form.data.campaign.merchantIds
    const next = checked
      ? [...current, merchantId]
      : current.filter((id) => id !== merchantId)
    update("merchantIds", next)
  }

  const visiblePrizes = form.data.campaign.prizesAttributes
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p._destroy)

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <label htmlFor="campaign_name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="campaign_name"
          value={form.data.campaign.name}
          onChange={(e) => update("name", e.target.value)}
          aria-invalid={!!form.errors["campaign.name"]}
          required
        />
        {form.errors["campaign.name"] && (
          <p className="text-sm text-destructive">{form.errors["campaign.name"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="campaign_slug" className="text-sm font-medium">
          Slug
        </label>
        <Input
          id="campaign_slug"
          value={form.data.campaign.slug}
          onChange={(e) => update("slug", e.target.value)}
          placeholder="(opcional — gerado a partir do nome)"
        />
        {form.errors["campaign.slug"] && (
          <p className="text-sm text-destructive">{form.errors["campaign.slug"]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="campaign_starts_at" className="text-sm font-medium">
            Início
          </label>
          <Input
            id="campaign_starts_at"
            type="datetime-local"
            value={form.data.campaign.startsAt}
            onChange={(e) => update("startsAt", e.target.value)}
            disabled={isActive}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="campaign_ends_at" className="text-sm font-medium">
            Fim
          </label>
          <Input
            id="campaign_ends_at"
            type="datetime-local"
            value={form.data.campaign.endsAt}
            onChange={(e) => update("endsAt", e.target.value)}
            required
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={isActive}>
        <legend className="text-sm font-medium mb-1">Tipo de campanha</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="entry_policy"
            checked={form.data.campaign.entryPolicy === "cumulative"}
            onChange={() => onPolicyChange("cumulative")}
            className="mt-1"
          />
          <span>
            <strong>Acumulativa</strong> — cada prêmio tem seu próprio marco
            de stamps (cliente entra no sorteio do prêmio ao atingir o marco).
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="entry_policy"
            checked={form.data.campaign.entryPolicy === "simple"}
            onChange={() => onPolicyChange("simple")}
            className="mt-1"
          />
          <span>
            <strong>Simples</strong> — cada visita registrada vale 1 entrada.
          </span>
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.data.campaign.requiresValidation}
          onChange={(e) => update("requiresValidation", e.target.checked)}
          disabled={isActive}
        />
        Exigir validação do lojista a cada check-in
      </label>

      {form.data.campaign.entryPolicy === "simple" && (
        <fieldset className="flex flex-col gap-2" disabled={isActive}>
          <legend className="text-sm font-medium mb-1">
            Limite de entradas por dia (por cliente)
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="day_cap_mode"
              checked={form.data.campaign.dayCap === null}
              onChange={() => update("dayCap", null)}
            />
            Sem limite
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="day_cap_mode"
              checked={form.data.campaign.dayCap !== null}
              onChange={() => update("dayCap", 1)}
            />
            <Input
              type="number"
              min={1}
              value={form.data.campaign.dayCap ?? ""}
              onChange={(e) => update("dayCap", Number(e.target.value) || 1)}
              disabled={form.data.campaign.dayCap === null}
              className="max-w-[100px]"
            />
            entrada(s) por dia
          </label>
        </fieldset>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          Prêmios{" "}
          <span className="text-muted-foreground font-normal">
            (mínimo 1 para ativar)
          </span>
        </h2>
        <div className="rounded-md border divide-y">
          {visiblePrizes.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum prêmio. Adicione abaixo.
            </p>
          )}
          {visiblePrizes.map(({ p, i }) => (
            <div key={p.id ?? `new-${i}`} className="flex items-center gap-2 p-3">
              {form.data.campaign.entryPolicy === "cumulative" && (
                <Input
                  type="number"
                  min={1}
                  value={p.threshold ?? ""}
                  onChange={(e) =>
                    updatePrize(i, { threshold: Number(e.target.value) || null })
                  }
                  className="max-w-[100px]"
                  placeholder="Stamps"
                />
              )}
              <Input
                value={p.name}
                onChange={(e) => updatePrize(i, { name: e.target.value })}
                placeholder="Nome do prêmio"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePrize(i)}
              >
                <TrashIcon />
                <span className="sr-only">Remover</span>
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addPrize}>
          <PlusIcon data-icon="inline-start" />
          Adicionar prêmio
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Lojistas participantes</h2>
        <div className="rounded-md border divide-y">
          {merchants.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum lojista cadastrado.
            </p>
          )}
          {merchants.map((m) => {
            const checked = form.data.campaign.merchantIds.includes(m.id)
            const removeBlocked = isActive && checked
            return (
              <label
                key={m.id}
                className="flex items-center gap-2 p-3 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleMerchant(m.id, e.target.checked)}
                  disabled={removeBlocked}
                />
                <span>{m.name}</span>
                {removeBlocked && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Não removível enquanto ativa
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </section>

      {form.errors["campaign.base"] && (
        <p className="text-sm text-destructive">{form.errors["campaign.base"]}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          {mode === "new" ? "Salvar como rascunho" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/organizations/campaigns">Cancelar</a>
        </Button>
      </div>
    </form>
  )
}
