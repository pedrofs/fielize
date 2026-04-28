"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CampaignActions({
  campaign,
}: {
  campaign: { id: string; status: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  if (campaign.status === "draft") {
    return (
      <Button
        onClick={() => setStatus("live")}
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Publicando…" : "Publicar"}
      </Button>
    );
  }
  if (campaign.status === "live") {
    return (
      <Button onClick={() => setStatus("ended")} variant="outline" disabled={isPending}>
        {isPending ? "Encerrando…" : "Encerrar"}
      </Button>
    );
  }
  return null;
}
