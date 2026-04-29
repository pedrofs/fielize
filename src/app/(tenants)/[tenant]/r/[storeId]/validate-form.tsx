"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Result =
  | { ok: true; prize: string; excedente: number; customerName?: string }
  | { ok: false; error: string };

const errorCopy: Record<string, string> = {
  not_found: "Código não encontrado.",
  wrong_store: "Este código é de outra loja.",
  already_used: "Este código já foi usado.",
  invalid_input: "Formato inválido. Digite os 6 dígitos.",
};

export function ValidateForm({ storeId }: { storeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "").trim();

    startTransition(async () => {
      const res = await fetch(`/api/r/${storeId}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, error: errorCopy[data.error] ?? data.error ?? "Erro" });
        return;
      }
      setResult({
        ok: true,
        prize: data.prize,
        excedente: data.excedente,
        customerName: data.customerName,
      });
    });
  };

  if (result?.ok) {
    return (
      <Alert>
        <AlertTitle>Resgate concluído ✓</AlertTitle>
        <AlertDescription>
          Prêmio: <strong>{result.prize}</strong>
          <br />
          Cliente continua com <strong>{result.excedente}</strong>{" "}
          {result.excedente === 1 ? "visita" : "visitas"} no novo cartão.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="code">Código do cliente</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="000000"
          required
          autoFocus
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Validando…" : "Validar"}
      </Button>
    </form>
  );
}
