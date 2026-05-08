import { useForm } from "@inertiajs/react"
import type { FormEvent } from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MerchantMapWidget } from "@/components/merchant-map-widget"

type FormData = {
  merchant: {
    name: string
    address: string
    latitude: number | null
    longitude: number | null
  }
}

type Props = {
  initial: {
    name: string
    address: string | null
    latitude: number | null
    longitude: number | null
  }
  submit: (form: ReturnType<typeof useForm<FormData>>) => void
  submitLabel: string
}

export function MerchantForm({ initial, submit, submitLabel }: Props) {
  const form = useForm<FormData>({
    merchant: {
      name: initial.name ?? "",
      address: initial.address ?? "",
      latitude: initial.latitude,
      longitude: initial.longitude,
    },
  })

  const [lookupError, setLookupError] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)

  const setMerchantField = <K extends keyof FormData["merchant"]>(
    key: K,
    value: FormData["merchant"][K],
  ) => {
    form.setData("merchant", { ...form.data.merchant, [key]: value })
  }

  const onLocate = async () => {
    setLookupError(null)
    if (!form.data.merchant.address.trim()) {
      setLookupError("Informe um endereço para localizar.")
      return
    }
    setLooking(true)
    try {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
          ?.content ?? ""
      const response = await fetch("/organizations/merchants/geocodings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ address: form.data.merchant.address }),
      })
      if (!response.ok) {
        setLookupError(
          "Não foi possível localizar este endereço. Ajuste o pino manualmente.",
        )
        return
      }
      const body = (await response.json()) as {
        latitude: number
        longitude: number
      }
      form.setData("merchant", {
        ...form.data.merchant,
        latitude: body.latitude,
        longitude: body.longitude,
      })
    } catch {
      setLookupError("Erro de rede ao localizar endereço.")
    } finally {
      setLooking(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(form)
  }

  const errors = form.errors as Record<string, string | undefined>

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="merchant_name" className="text-sm font-medium">
          Nome
        </label>
        <Input
          id="merchant_name"
          value={form.data.merchant.name}
          onChange={(e) => setMerchantField("name", e.target.value)}
          aria-invalid={!!errors["merchant.name"]}
          required
          autoFocus
        />
        {errors["merchant.name"] && (
          <p className="text-sm text-destructive">{errors["merchant.name"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="merchant_address" className="text-sm font-medium">
          Endereço
        </label>
        <div className="flex gap-2">
          <Input
            id="merchant_address"
            value={form.data.merchant.address}
            onChange={(e) => setMerchantField("address", e.target.value)}
            aria-invalid={!!errors["merchant.address"]}
            placeholder="Rua, número, bairro, cidade"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onLocate}
            disabled={looking}
          >
            {looking ? "Localizando..." : "Localizar"}
          </Button>
        </div>
        {errors["merchant.address"] && (
          <p className="text-sm text-destructive">
            {errors["merchant.address"]}
          </p>
        )}
        {lookupError && (
          <p className="text-sm text-destructive">{lookupError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Após localizar, ajuste o pino no mapa para a posição correta antes de
          salvar.
        </p>
      </div>

      <MerchantMapWidget
        latitude={form.data.merchant.latitude}
        longitude={form.data.merchant.longitude}
        onChange={(lat, lng) => {
          form.setData("merchant", {
            ...form.data.merchant,
            latitude: lat,
            longitude: lng,
          })
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="merchant_latitude" className="text-xs font-medium">
            Latitude
          </label>
          <Input
            id="merchant_latitude"
            type="number"
            step="any"
            value={form.data.merchant.latitude ?? ""}
            onChange={(e) =>
              setMerchantField(
                "latitude",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            aria-invalid={!!errors["merchant.latitude"]}
          />
          {errors["merchant.latitude"] && (
            <p className="text-xs text-destructive">
              {errors["merchant.latitude"]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="merchant_longitude" className="text-xs font-medium">
            Longitude
          </label>
          <Input
            id="merchant_longitude"
            type="number"
            step="any"
            value={form.data.merchant.longitude ?? ""}
            onChange={(e) =>
              setMerchantField(
                "longitude",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            aria-invalid={!!errors["merchant.longitude"]}
          />
          {errors["merchant.longitude"] && (
            <p className="text-xs text-destructive">
              {errors["merchant.longitude"]}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={form.processing}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href="/organizations/merchants">Cancelar</a>
        </Button>
      </div>
    </form>
  )
}
