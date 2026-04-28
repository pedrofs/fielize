"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type MerchantRow = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  phoneWhatsapp: string | null;
};

export function OnboardingForm({ merchant }: { merchant: MerchantRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      category: String(fd.get("category") ?? "") || undefined,
      address: String(fd.get("address") ?? "") || undefined,
      phoneWhatsapp: String(fd.get("phoneWhatsapp") ?? "") || undefined,
    };

    startTransition(async () => {
      const res = await fetch("/api/m/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao salvar");
        return;
      }
      router.push("/m/dashboard");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Nome da loja</Label>
        <Input id="name" name="name" defaultValue={merchant.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Input
          id="category"
          name="category"
          defaultValue={merchant.category ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          name="address"
          defaultValue={merchant.address ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phoneWhatsapp">WhatsApp</Label>
        <Input
          id="phoneWhatsapp"
          name="phoneWhatsapp"
          defaultValue={merchant.phoneWhatsapp ?? ""}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Salvando…" : "Salvar e continuar"}
      </Button>
    </form>
  );
}
