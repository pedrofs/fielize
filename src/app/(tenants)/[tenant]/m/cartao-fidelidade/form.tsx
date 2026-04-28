"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  existing: { id: string; threshold: number; prize: string; status: string } | null;
};

export function CartaoConfigForm({ existing }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      threshold: Number(fd.get("threshold") ?? 10),
      prize: String(fd.get("prize") ?? ""),
      activate: fd.get("activate") === "on",
    };

    startTransition(async () => {
      const res = await fetch("/api/m/cartao-fidelidade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao salvar");
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
        <Label htmlFor="threshold">Visitas necessárias</Label>
        <Input
          id="threshold"
          name="threshold"
          type="number"
          min={2}
          defaultValue={existing?.threshold ?? 10}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prize">Prêmio</Label>
        <Input
          id="prize"
          name="prize"
          placeholder="1 par de meias grátis"
          defaultValue={existing?.prize ?? ""}
          required
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="activate"
          defaultChecked={existing?.status !== "ended"}
          className="mt-0.5"
        />
        <span>
          Ativar o cartão fidelidade. Você pode pausar a qualquer momento — clientes
          mantêm o que já acumularam.
        </span>
      </label>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Salvando…" : existing ? "Atualizar" : "Ativar cartão"}
      </Button>
    </form>
  );
}
