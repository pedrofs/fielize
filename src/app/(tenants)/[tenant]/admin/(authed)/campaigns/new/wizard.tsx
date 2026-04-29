"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Merchant = { id: string; name: string };

export function CampaignWizard({ merchants }: { merchants: Merchant[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<"passport" | "sorteio">("passport");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleMerchant = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      templateId: template,
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? "") || undefined,
      startsAt: String(fd.get("startsAt") ?? "") || undefined,
      endsAt: String(fd.get("endsAt") ?? "") || undefined,
      stampsRequired:
        template === "passport" ? Number(fd.get("stampsRequired") ?? 6) : undefined,
      entriesPerDay:
        template === "sorteio" ? Number(fd.get("entriesPerDay") ?? 1) : undefined,
      prize: String(fd.get("prize") ?? ""),
      merchantIds: Array.from(selected),
    };

    if (payload.merchantIds.length === 0) {
      setError("Selecione ao menos um comerciante.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao criar campanha");
        return;
      }
      router.push(`/admin/campaigns/${data.campaign.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={template}
          onValueChange={(v) => setTemplate(v as "passport" | "sorteio")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="passport">Passaporte (selos + sorteio)</SelectItem>
            <SelectItem value="sorteio">Sorteio (uma entrada por visita)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" placeholder="Pasaporte de Compras" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" placeholder="pasaporte-2026" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" placeholder="Visite e ganhe…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Início</Label>
          <Input id="startsAt" name="startsAt" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">Encerramento</Label>
          <Input id="endsAt" name="endsAt" type="date" />
        </div>
      </div>

      {template === "passport" ? (
        <div className="space-y-2">
          <Label htmlFor="stampsRequired">Selos para completar</Label>
          <Input
            id="stampsRequired"
            name="stampsRequired"
            type="number"
            min={2}
            defaultValue={6}
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="entriesPerDay">Entradas por dia (cap)</Label>
          <Input
            id="entriesPerDay"
            name="entriesPerDay"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="prize">Prêmio (descrição)</Label>
        <Input id="prize" name="prize" placeholder="Vale-compra de R$500" required />
      </div>

      <div className="space-y-2">
        <Label>Comerciantes participantes</Label>
        {merchants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum comerciante cadastrado. Volte em /admin/merchants.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm">
            {merchants.map((m) => (
              <label key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggleMerchant(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Criando…" : "Criar como rascunho"}
      </Button>
    </form>
  );
}
