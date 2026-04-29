"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  association: {
    name: string;
    brand: { primary_color?: string; accent_color?: string };
  };
};

export function SettingsForm({ association }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [primary, setPrimary] = useState(association.brand.primary_color ?? "#1d3a8c");
  const [accent, setAccent] = useState(association.brand.accent_color ?? "#f59e0b");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      primaryColor: primary,
      accentColor: accent,
    };

    startTransition(async () => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha");
        return;
      }
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
        <Label htmlFor="name">Nome da CDL</Label>
        <Input id="name" name="name" defaultValue={association.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="primary">Cor primária</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="primary"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-9 w-12 rounded border"
            />
            <Input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="accent">Cor de destaque</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="accent"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-12 rounded border"
            />
            <Input
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>
      <div
        className="rounded-md p-4 text-sm text-white"
        style={{ backgroundColor: primary }}
      >
        Pré-visualização: cabeçalho da CDL
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: primary }}
      >
        {isPending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
