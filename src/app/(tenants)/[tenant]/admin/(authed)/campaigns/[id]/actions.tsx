"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CampaignActions({
  campaign,
}: {
  campaign: { id: string; status: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawResult, setDrawResult] = useState<{ seed: string; winnerUserId: string } | null>(
    null,
  );

  const setStatus = (status: "live" | "ended") => {
    startTransition(async () => {
      await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  };

  const draw = () => {
    setDrawError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/draw`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setDrawError(data.error ?? "Falha");
        return;
      }
      setDrawResult({ seed: data.seed, winnerUserId: data.winnerUserId });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {campaign.status === "draft" ? (
        <Button
          onClick={() => setStatus("live")}
          disabled={isPending}
          style={{ backgroundColor: "var(--cdl-primary)" }}
        >
          {isPending ? "Publicando…" : "Publicar"}
        </Button>
      ) : null}
      {campaign.status === "live" ? (
        <Button onClick={() => setStatus("ended")} variant="outline" disabled={isPending}>
          {isPending ? "Encerrando…" : "Encerrar e sortear"}
        </Button>
      ) : null}
      {campaign.status === "ended" ? (
        <Button onClick={draw} disabled={isPending}>
          {isPending ? "Sorteando…" : "Rodar sorteio"}
        </Button>
      ) : null}
      {drawError ? (
        <Alert variant="destructive" className="max-w-xs">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{drawError}</AlertDescription>
        </Alert>
      ) : null}
      {drawResult ? (
        <Alert className="max-w-xs">
          <AlertTitle>Vencedor sorteado</AlertTitle>
          <AlertDescription className="break-all font-mono text-xs">
            user: {drawResult.winnerUserId}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
