"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Issued = {
  code: string;
  prize: string;
  merchantName: string;
};

export function RedeemActions({ participationId }: { participationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha");
        return;
      }
      setIssued(data);
    });
  };

  if (issued) {
    return (
      <Alert>
        <AlertTitle>Código de resgate</AlertTitle>
        <AlertDescription>
          <p className="my-2 text-3xl font-mono font-semibold tracking-widest text-center">
            {issued.code}
          </p>
          <p className="text-center text-sm">
            Apresente em <strong>{issued.merchantName}</strong>. Sem prazo.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        className="w-full"
        size="lg"
        onClick={onClick}
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Gerando código…" : "Resgatar agora"}
      </Button>
    </div>
  );
}
