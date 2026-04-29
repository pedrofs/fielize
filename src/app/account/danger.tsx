"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DangerZone() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const exportData = () => {
    window.location.href = "/api/me/export";
  };

  const deleteAccount = () => {
    if (
      !window.confirm(
        "Excluir conta? Soft-delete imediato, purga em até 30 dias. As CDLs deixam de ver suas participações já.",
      )
    )
      return;
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/me", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Falha ao excluir");
        return;
      }
      window.location.href = "/";
    });
  };

  return (
    <section className="space-y-3 rounded-lg border border-dashed p-6">
      <h2 className="text-sm font-medium">Privacidade · LGPD</h2>
      {message ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button onClick={exportData} variant="outline" size="sm">
          Baixar meus dados (JSON)
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteAccount}
          disabled={isPending}
        >
          {isPending ? "Excluindo…" : "Excluir minha conta"}
        </Button>
      </div>
    </section>
  );
}
