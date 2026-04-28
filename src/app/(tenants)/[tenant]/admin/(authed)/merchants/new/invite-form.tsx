"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function InviteForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMagicLink(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      category: String(fd.get("category") ?? "") || undefined,
      address: String(fd.get("address") ?? "") || undefined,
      phoneWhatsapp: String(fd.get("phoneWhatsapp") ?? "") || undefined,
      lat: fd.get("lat") ? Number(fd.get("lat")) : undefined,
      lng: fd.get("lng") ? Number(fd.get("lng")) : undefined,
    };

    startTransition(async () => {
      const res = await fetch("/api/admin/merchants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao convidar comerciante");
        return;
      }
      setMagicLink(data.magicLink ?? null);
      if (!data.magicLink) {
        router.push("/admin/merchants");
        router.refresh();
      }
    });
  };

  if (magicLink) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Comerciante criado</AlertTitle>
          <AlertDescription>
            Compartilhe o link abaixo (e-mail também foi enviado pelo Supabase
            quando configurado).
          </AlertDescription>
        </Alert>
        <div className="break-all rounded-md border bg-muted p-3 font-mono text-xs">
          {magicLink}
        </div>
        <Button onClick={() => router.push("/admin/merchants")} className="w-full">
          Voltar à lista
        </Button>
      </div>
    );
  }

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
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail do responsável</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" name="category" placeholder="Calçados, moda…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneWhatsapp">WhatsApp</Label>
          <Input
            id="phoneWhatsapp"
            name="phoneWhatsapp"
            placeholder="+55 53 99999-0000"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input id="address" name="address" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" name="lat" type="number" step="0.0000001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" name="lng" type="number" step="0.0000001" />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Convidando…" : "Convidar"}
      </Button>
    </form>
  );
}
