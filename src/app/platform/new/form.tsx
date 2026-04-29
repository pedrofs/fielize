"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OnboardForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      city: String(fd.get("city") ?? "") || undefined,
      state: String(fd.get("state") ?? "") || undefined,
      adminEmail: String(fd.get("adminEmail") ?? ""),
    };

    startTransition(async () => {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha");
        return;
      }
      setMagicLink(data.magicLink);
      router.refresh();
    });
  };

  if (magicLink) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>CDL criada</AlertTitle>
          <AlertDescription>
            Link mágico do admin abaixo (compartilhe; o e-mail também é
            enviado pelo Supabase quando configurado).
          </AlertDescription>
        </Alert>
        <div className="break-all rounded-md border bg-muted p-3 font-mono text-xs">
          {magicLink}
        </div>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" placeholder="CDL Pelotas" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (subdomínio)</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="cdlpelotas"
            pattern="[a-z0-9-]+"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">UF</Label>
          <Input id="state" name="state" maxLength={2} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminEmail">E-mail do admin</Label>
        <Input id="adminEmail" name="adminEmail" type="email" required />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Criando…" : "Criar CDL"}
      </Button>
    </form>
  );
}
