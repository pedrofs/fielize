"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  associationId: string;
  storeId: string;
  cdlName: string;
};

export function IdentifyForm({ associationId, storeId, cdlName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const sendScan = (geo: { lat?: number; lng?: number; accuracy?: number; denied?: boolean }) => {
      void fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId, associationId, geo }),
      });
    };
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        sendScan({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => sendScan({ denied: true }),
      { timeout: 4000, enableHighAccuracy: false },
    );
  }, [associationId, storeId]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDevMagicLink(null);
    const fd = new FormData(e.currentTarget);
    const phone = String(fd.get("phone") ?? "");
    const optIn = fd.get("optIn") === "on";

    if (!optIn) {
      setError("Você precisa concordar com a política para participar.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone,
          associationId,
          storeId,
          optIn: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao enviar");
        return;
      }
      if (data.dev_magic_link) {
        setDevMagicLink(data.dev_magic_link);
        return;
      }
      router.push("/c/awaiting");
    });
  };

  if (devMagicLink) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Link mágico (dev)</AlertTitle>
          <AlertDescription>
            WhatsApp está mockado. Clique para completar a identificação.
          </AlertDescription>
        </Alert>
        <a
          href={devMagicLink}
          className={buttonVariants({ size: "lg", className: "w-full" })}
          style={{ backgroundColor: "var(--cdl-primary)" }}
        >
          Abrir link mágico
        </a>
        <p className="break-all rounded-md border bg-muted p-3 font-mono text-[10px]">
          {devMagicLink}
        </p>
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
        <Label htmlFor="phone">WhatsApp</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+55 53 99999-0000"
          required
        />
        <p className="text-xs text-muted-foreground">
          Inclua o código do país. Ex.: +55 (Brasil), +598 (Uruguai).
        </p>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="optIn" className="mt-0.5" />
        <span>
          Concordo em receber comunicações da {cdlName} no WhatsApp e que meu
          telefone seja armazenado conforme a LGPD. Fraude resulta em
          desclassificação.
        </span>
      </label>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
        style={{ backgroundColor: "var(--cdl-primary)" }}
      >
        {isPending ? "Enviando…" : "Participar"}
      </Button>
    </form>
  );
}
