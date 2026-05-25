import { useForm, Link } from "@inertiajs/react"
import type { FormEvent } from "react"
import { TrashIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TrixEditor } from "@/components/trix-editor"
import type { Campaign, EntryPolicy, PrizeInput } from "@/types"

type Mode = "new" | "edit"

type Props = {
  mode: Mode
  campaign: Campaign
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
    prizesAttributes: PrizeInput[]
    description: string
    terms: string
    heroImage: File | null
  }
}

export function CampaignForm({ mode, campaign }: Props) {
  const form = useForm<FormShape>({
    campaign: {
      name: campaign.name,
      slug: campaign.slug,
      startsAt: campaign.startsAt ?? "",
      endsAt: campaign.endsAt ?? "",
      entryPolicy: campaign.entryPolicy,
      requiresValidation: campaign.requiresValidation,
      dayCap: campaign.dayCap,
      prizesAttributes: campaign.prizes.map((p) => ({
        id: p.id,
        name: p.name,
        threshold: p.threshold,
        position: p.position,
      })),
      description: campaign.description ?? "",
      terms: campaign.terms ?? "",
      heroImage: null,
    },
  })

  const isActive = campaign.status === "active"

  // Inertia/Rails return validation errors under flat attribute keys
  // (name, endsAt, "prizes.name", base) — after caseshift, NOT prefixed
  // with the form's "campaign" namespace. Read by attribute key and
  // collapse multiple messages into one line.
  const fieldError = (key: string): string | undefined => {
    const errors = form.errors as Record<string, string | string[] | undefined>
    const value = errors[key]
    return Array.isArray(value) ? value.join(" ") : value
  }

  const update = <K extends keyof FormShape["campaign"]>(
    key: K,
    value: FormShape["campaign"][K]
  ) => {
    form.setData("campaign", { ...form.data.campaign, [key]: value })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === "new") {
      form.post("/organizations/campaigns", { forceFormData: true })
    } else {
      form.patch(`/organizations/campaigns/${campaign.id}`, { forceFormData: true })
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
          aria-invalid={!!fieldError("name")}
          required
        />
        {fieldError("name") && (
          <p className="text-sm text-destructive">{fieldError("name")}</p>
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
          aria-invalid={!!fieldError("slug")}
        />
        {fieldError("slug") && (
          <p className="text-sm text-destructive">{fieldError("slug")}</p>
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
            aria-invalid={!!fieldError("startsAt")}
            required
          />
          {fieldError("startsAt") && (
            <p className="text-sm text-destructive">{fieldError("startsAt")}</p>
          )}
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
            aria-invalid={!!fieldError("endsAt")}
            required
          />
          {fieldError("endsAt") && (
            <p className="text-sm text-destructive">{fieldError("endsAt")}</p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3" disabled={isActive}>
        <legend className="text-sm font-medium mb-1">Tipo de campanha</legend>
        <RadioGroup
          value={form.data.campaign.entryPolicy}
          onValueChange={(value) => onPolicyChange(value as EntryPolicy)}
          disabled={isActive}
        >
          <label
            htmlFor="entry_policy_cumulative"
            className="flex items-start gap-2 text-sm"
          >
            <RadioGroupItem
              value="cumulative"
              id="entry_policy_cumulative"
              className="mt-0.5"
            />
            <span>
              <strong>Acumulativa</strong> — cada prêmio tem seu próprio marco
              de stamps (cliente entra no sorteio do prêmio ao atingir o marco).
            </span>
          </label>
          <label
            htmlFor="entry_policy_simple"
            className="flex items-start gap-2 text-sm"
          >
            <RadioGroupItem
              value="simple"
              id="entry_policy_simple"
              className="mt-0.5"
            />
            <span>
              <strong>Simples</strong> — cada visita registrada vale 1 entrada.
            </span>
          </label>
        </RadioGroup>
      </fieldset>

      <label htmlFor="requires_validation" className="flex items-center gap-2 text-sm">
        <Checkbox
          id="requires_validation"
          checked={form.data.campaign.requiresValidation}
          onCheckedChange={(checked) =>
            update("requiresValidation", checked === true)
          }
          disabled={isActive}
        />
        Exigir validação do lojista a cada check-in
      </label>

      {form.data.campaign.entryPolicy === "simple" && (
        <fieldset className="flex flex-col gap-3" disabled={isActive}>
          <legend className="text-sm font-medium mb-1">
            Limite de entradas por dia (por cliente)
          </legend>
          <RadioGroup
            value={form.data.campaign.dayCap === null ? "none" : "limited"}
            onValueChange={(value) =>
              update("dayCap", value === "none" ? null : 1)
            }
            disabled={isActive}
          >
            <label htmlFor="day_cap_none" className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="none" id="day_cap_none" />
              Sem limite
            </label>
            <label
              htmlFor="day_cap_limited"
              className="flex items-center gap-2 text-sm"
            >
              <RadioGroupItem value="limited" id="day_cap_limited" />
              <Input
                type="number"
                min={1}
                value={form.data.campaign.dayCap ?? ""}
                onChange={(e) => update("dayCap", Number(e.target.value) || 1)}
                disabled={form.data.campaign.dayCap === null}
                className="max-w-[100px]"
                aria-label="Entradas por dia"
              />
              entrada(s) por dia
            </label>
          </RadioGroup>
          {fieldError("dayCap") && (
            <p className="text-sm text-destructive">{fieldError("dayCap")}</p>
          )}
        </fieldset>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">
          Prêmios{" "}
          <span className="text-muted-foreground font-normal">
            (mínimo 1 para ativar)
          </span>
        </h2>
        {(fieldError("prizes") ||
          fieldError("prizes.name") ||
          fieldError("prizes.threshold")) && (
          <p className="text-sm text-destructive">
            {fieldError("prizes") ||
              fieldError("prizes.name") ||
              fieldError("prizes.threshold")}
          </p>
        )}
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
        <Label htmlFor="campaign_description">Descrição</Label>
        <TrixEditor
          id="campaign_description"
          value={form.data.campaign.description}
          onChange={(html) => update("description", html)}
          placeholder="Conte sobre essa campanha…"
        />
        {fieldError("description") && (
          <p className="text-sm text-destructive">{fieldError("description")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="campaign_hero_image">Imagem de capa</Label>
        {campaign.heroImageUrl && (
          <img
            src={campaign.heroImageUrl}
            alt=""
            className="mb-2 h-32 w-full rounded-md object-cover"
            data-testid="current-campaign-hero-image"
          />
        )}
        <Input
          id="campaign_hero_image"
          type="file"
          accept="image/*"
          onChange={(e) => update("heroImage", e.target.files?.[0] ?? null)}
        />
        {fieldError("heroImage") && (
          <p className="text-sm text-destructive">{fieldError("heroImage")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="campaign_terms">
          Termos (opcional — herda os termos da organização)
        </Label>
        <TrixEditor
          id="campaign_terms"
          value={form.data.campaign.terms}
          onChange={(html) => update("terms", html)}
          placeholder="Termos específicos desta campanha…"
        />
        {fieldError("terms") && (
          <p className="text-sm text-destructive">{fieldError("terms")}</p>
        )}
      </section>

      {fieldError("base") && (
        <p className="text-sm text-destructive">{fieldError("base")}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          {mode === "new" ? "Salvar como rascunho" : "Salvar alterações"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/organizations/campaigns">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
